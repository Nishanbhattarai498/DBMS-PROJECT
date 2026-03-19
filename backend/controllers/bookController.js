const pool = require('../config/database');

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

    if (!title || !author || !isbn || !total_quantity) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const connection = await pool.getConnection();
    await connection.query(
      'INSERT INTO books (title, author, faculty, isbn, total_quantity, available_quantity) VALUES (?, ?, ?, ?, ?, ?)',
      [title, author, faculty || 'Science & Tech', isbn, total_quantity, total_quantity]
    );
    connection.release();

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

    const connection = await pool.getConnection();
    
    const [book] = await connection.query('SELECT * FROM books WHERE id = ?', [id]);
    if (book.length === 0) {
      connection.release();
      return res.status(404).json({ message: 'Book not found' });
    }

    const quantityChange = total_quantity - book[0].total_quantity;
    const newAvailableQty = book[0].available_quantity + quantityChange;

    await connection.query(
      'UPDATE books SET title = ?, author = ?, faculty = ?, isbn = ?, total_quantity = ?, available_quantity = ? WHERE id = ?',
      [title || book[0].title, author || book[0].author, faculty || book[0].faculty, isbn || book[0].isbn, total_quantity || book[0].total_quantity, newAvailableQty, id]
    );
    connection.release();

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
    await connection.query('DELETE FROM books WHERE id = ?', [id]);
    connection.release();

    res.json({ message: 'Book deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getAllBooks, getBookById, addBook, updateBook, deleteBook };
