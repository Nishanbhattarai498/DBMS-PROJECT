const pool = require('../config/database');

const makeCopyCode = (isbn, bookId, seq) => {
  const cleanIsbn = String(isbn || 'BOOK').replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'BOOK';
  return `${cleanIsbn}-${bookId}-${String(seq).padStart(4, '0')}`;
};

const buildCopyInsertQuery = (rows) => {
  const placeholders = rows.map(() => '(?, ?, ?)').join(', ');
  const values = rows.flat();
  return { placeholders, values };
};

// Get all books with pagination and search
const getAllBooks = async (req, res) => {
  try {
    const { search, faculty, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM books';
    let countQuery = 'SELECT COUNT(*) as total FROM books';
    let params = [];

    if (search) {
      query += ' WHERE title LIKE ? OR author LIKE ? OR isbn LIKE ?';
      countQuery += ' WHERE title LIKE ? OR author LIKE ? OR isbn LIKE ?';
      const searchTerm = `%${search}%`;
      params = [searchTerm, searchTerm, searchTerm];
    }

    if (faculty) {
      if (search) {
        query += ' AND faculty = ?';
        countQuery += ' AND faculty = ?';
      } else {
        query += ' WHERE faculty = ?';
        countQuery += ' WHERE faculty = ?';
      }
      params.push(faculty);
    }

    const connection = await pool.getConnection();
    
    const [countResult] = await connection.query(countQuery, params);
    const total = countResult[0].total;

    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [books] = await connection.query(query, params);
    connection.release();

    res.json({
      books,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get single book by ID
const getBookById = async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();
    const [book] = await connection.query('SELECT * FROM books WHERE id = ?', [id]);
    connection.release();

    if (book.length === 0) {
      return res.status(404).json({ message: 'Book not found' });
    }

    res.json(book[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add new book
const addBook = async (req, res) => {
  try {
    const { title, author, faculty, isbn, total_quantity } = req.body;
    const totalQty = parseInt(total_quantity, 10);

    if (!title || !author || !isbn || !total_quantity) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (Number.isNaN(totalQty) || totalQty < 1) {
      return res.status(400).json({ message: 'Total quantity must be at least 1' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.query(
        'INSERT INTO books (title, author, faculty, isbn, total_quantity, available_quantity) VALUES (?, ?, ?, ?, ?, ?)',
        [title, author, faculty || 'Science & Tech', isbn, totalQty, totalQty]
      );

      const bookId = result.insertId;
      const copyRows = Array.from({ length: totalQty }, (_, index) => [bookId, index + 1, makeCopyCode(isbn, bookId, index + 1)]);
      const { placeholders, values } = buildCopyInsertQuery(copyRows);
      await connection.query(
        `INSERT INTO book_copies (book_id, copy_number, copy_code) VALUES ${placeholders}`,
        values
      );

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    res.status(201).json({ message: 'Book added successfully' });
  } catch (error) {
    console.error(error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'ISBN already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Update book
const updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, author, faculty, isbn, total_quantity } = req.body;
    const newTotal = total_quantity !== undefined ? parseInt(total_quantity, 10) : undefined;

    if (newTotal !== undefined && (Number.isNaN(newTotal) || newTotal < 1)) {
      return res.status(400).json({ message: 'Total quantity must be at least 1' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [book] = await connection.query('SELECT * FROM books WHERE id = ? FOR UPDATE', [id]);
      if (book.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: 'Book not found' });
      }

      const existing = book[0];
      const targetTotal = newTotal !== undefined ? newTotal : existing.total_quantity;

      const [issued] = await connection.query(
        'SELECT COUNT(*) as count FROM issued_books WHERE book_id = ? AND status = "issued"',
        [id]
      );
      const issuedCount = issued[0].count;

      if (targetTotal < issuedCount) {
        await connection.rollback();
        return res.status(400).json({ message: `Total quantity cannot be less than currently issued copies (${issuedCount})` });
      }

      if (targetTotal > existing.total_quantity) {
        const copiesToAdd = targetTotal - existing.total_quantity;
        const [copyCountResult] = await connection.query('SELECT COUNT(*) as count FROM book_copies WHERE book_id = ?', [id]);
        const startSeq = copyCountResult[0].count + 1;
        const copyRows = Array.from({ length: copiesToAdd }, (_, index) => [
          id,
          startSeq + index,
          makeCopyCode(isbn || existing.isbn, id, startSeq + index),
        ]);
        const { placeholders, values } = buildCopyInsertQuery(copyRows);
        await connection.query(
          `INSERT INTO book_copies (book_id, copy_number, copy_code) VALUES ${placeholders}`,
          values
        );
      } else if (targetTotal < existing.total_quantity) {
        const copiesToRemove = existing.total_quantity - targetTotal;
        const [deleteResult] = await connection.query(
          'DELETE FROM book_copies WHERE book_id = ? AND status = "available" ORDER BY id DESC LIMIT ?',
          [id, copiesToRemove]
        );

        if (deleteResult.affectedRows !== copiesToRemove) {
          await connection.rollback();
          return res.status(400).json({ message: 'Not enough available copies to reduce total quantity' });
        }
      }

      const [availableResult] = await connection.query(
        'SELECT COUNT(*) as count FROM book_copies WHERE book_id = ? AND status = "available"',
        [id]
      );
      const availableQty = availableResult[0].count;

      await connection.query(
        'UPDATE books SET title = ?, author = ?, faculty = ?, isbn = ?, total_quantity = ?, available_quantity = ? WHERE id = ?',
        [
          title || existing.title,
          author || existing.author,
          faculty || existing.faculty,
          isbn || existing.isbn,
          targetTotal,
          availableQty,
          id,
        ]
      );

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    res.json({ message: 'Book updated successfully' });
  } catch (error) {
    console.error(error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'ISBN already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete book
const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();
    
    const [book] = await connection.query('SELECT * FROM books WHERE id = ?', [id]);
    if (book.length === 0) {
      connection.release();
      return res.status(404).json({ message: 'Book not found' });
    }

    const [issued] = await connection.query(
      'SELECT COUNT(*) as count FROM issued_books WHERE book_id = ? AND status = "issued"',
      [id]
    );

    if (issued[0].count > 0) {
      connection.release();
      return res.status(400).json({ message: 'Cannot delete book with issued copies' });
    }

    await connection.query('DELETE FROM issued_books WHERE book_id = ?', [id]);
    await connection.query('DELETE FROM book_copies WHERE book_id = ?', [id]);
    await connection.query('DELETE FROM books WHERE id = ?', [id]);
    connection.release();

    res.json({ message: 'Book deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getAllBooks, getBookById, addBook, updateBook, deleteBook };
