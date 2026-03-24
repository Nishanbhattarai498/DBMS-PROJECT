const pool = require('../config/database');
const { sendEmail } = require('../utils/mailer');

const syncBookAvailability = async (connection, bookId) => {
  const [availableResult] = await connection.query(
    'SELECT COUNT(*) as count FROM book_copies WHERE book_id = ? AND status = "available"',
    [bookId]
  );

  await connection.query(
    'UPDATE books SET available_quantity = ? WHERE id = ?',
    [availableResult[0].count, bookId]
  );
};

// Get all issued books
const getAllIssuedBooks = async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

        let query = `SELECT ib.*, b.title, b.author, bc.copy_number, bc.copy_code, u.name as student_name, u.email
                 FROM issued_books ib
                 JOIN books b ON ib.book_id = b.id
           JOIN book_copies bc ON ib.copy_id = bc.id
                 JOIN users u ON ib.user_id = u.id`;
    
    let countQuery = `SELECT COUNT(*) as total FROM issued_books`;
    let params = [];

    if (status !== 'all') {
      query += ' WHERE ib.status = ?';
      countQuery += ' WHERE status = ?';
      params.push(status);
    }

    const connection = await pool.getConnection();
    
    const [countResult] = await connection.query(countQuery, params);
    const total = countResult[0].total;

    query += ' ORDER BY ib.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [issuedBooks] = await connection.query(query, params);
    connection.release();

    res.json({
      issuedBooks,
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

// Issue a book
const issueBook = async (req, res) => {
  try {
    const { book_id, copy_id, copy_number, user_id, issue_date, due_date } = req.body;
    const requestedCopyNumber = copy_number !== undefined && copy_number !== null && String(copy_number).trim() !== ''
      ? parseInt(copy_number, 10)
      : null;

    if ((!book_id && !copy_id) || !user_id || !issue_date || !due_date) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (requestedCopyNumber !== null && (Number.isNaN(requestedCopyNumber) || requestedCopyNumber < 1)) {
      return res.status(400).json({ message: 'Copy number must be a positive integer' });
    }

    if (!book_id && requestedCopyNumber !== null) {
      return res.status(400).json({ message: 'Book is required when selecting a copy number' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Check if user exists
      const [user] = await connection.query('SELECT * FROM users WHERE id = ?', [user_id]);
      if (user.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: 'User not found' });
      }

      let selectedCopy;

      if (copy_id) {
        const [copyResult] = await connection.query(
          `SELECT bc.id as copy_id, bc.book_id, bc.copy_number, bc.copy_code, b.title
           FROM book_copies bc
           JOIN books b ON b.id = bc.book_id
           WHERE bc.id = ? AND bc.status = "available"
           LIMIT 1 FOR UPDATE`,
          [copy_id]
        );

        if (copyResult.length === 0) {
          await connection.rollback();
          return res.status(400).json({ message: 'Selected copy is not available' });
        }

        if (book_id && Number(book_id) !== Number(copyResult[0].book_id)) {
          await connection.rollback();
          return res.status(400).json({ message: 'Book and copy mismatch' });
        }

        selectedCopy = copyResult[0];
      } else if (requestedCopyNumber !== null) {
        const [copyResult] = await connection.query(
          `SELECT bc.id as copy_id, bc.book_id, bc.copy_number, bc.copy_code, b.title
           FROM book_copies bc
           JOIN books b ON b.id = bc.book_id
           WHERE bc.book_id = ? AND bc.copy_number = ? AND bc.status = "available"
           LIMIT 1 FOR UPDATE`,
          [book_id, requestedCopyNumber]
        );

        if (copyResult.length === 0) {
          await connection.rollback();
          return res.status(400).json({ message: 'Requested copy number is not available' });
        }

        selectedCopy = copyResult[0];
      } else {
        const [copyResult] = await connection.query(
          `SELECT bc.id as copy_id, bc.book_id, bc.copy_number, bc.copy_code, b.title
           FROM book_copies bc
           JOIN books b ON b.id = bc.book_id
           WHERE bc.book_id = ? AND bc.status = "available"
           ORDER BY bc.copy_number ASC
           LIMIT 1 FOR UPDATE`,
          [book_id]
        );

        if (copyResult.length === 0) {
          await connection.rollback();
          return res.status(400).json({ message: 'Book not available' });
        }

        selectedCopy = copyResult[0];
      }

      // Check if user already has this title issued
      const [existingIssue] = await connection.query(
        'SELECT id FROM issued_books WHERE book_id = ? AND user_id = ? AND status = "issued" LIMIT 1',
        [selectedCopy.book_id, user_id]
      );

      if (existingIssue.length > 0) {
        await connection.rollback();
        return res.status(400).json({ message: 'User already has this book issued' });
      }

      await connection.query(
        'INSERT INTO issued_books (copy_id, book_id, user_id, issued_date, due_date) VALUES (?, ?, ?, ?, ?)',
        [selectedCopy.copy_id, selectedCopy.book_id, user_id, issue_date, due_date]
      );

      await connection.query(
        'UPDATE book_copies SET status = "issued" WHERE id = ?',
        [selectedCopy.copy_id]
      );

      await syncBookAvailability(connection, selectedCopy.book_id);
      await connection.commit();

      // Send Email Alert
      if (user[0].email) {
        sendEmail(
          user[0].email,
          'Book Issued Successfully - Library Management',
          `Hello ${user[0].name}, you have been issued '${selectedCopy.title}' (Copy No: ${selectedCopy.copy_number}, Code: ${selectedCopy.copy_code}). Please return it by ${due_date}.`,
          `<h3>Library Management System</h3>
           <p>Hello <b>${user[0].name}</b>,</p>
           <p>You have been issued <b>${selectedCopy.title}</b>.</p>
           <p>Copy No: <b>${selectedCopy.copy_number}</b></p>
           <p>Copy Code: <b>${selectedCopy.copy_code}</b></p>
           <p>Please note that the <b>due date is ${due_date}</b>.</p>`
        );
      }

      res.status(201).json({
        message: 'Book issued successfully',
        copy_id: selectedCopy.copy_id,
        copy_number: selectedCopy.copy_number,
        copy_code: selectedCopy.copy_code,
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Return a book
const returnBook = async (req, res) => {
  try {
    const { issue_id, return_date } = req.body;

    if (!issue_id || !return_date) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get issue record
      const [issue] = await connection.query(
        'SELECT * FROM issued_books WHERE id = ? AND status = "issued" LIMIT 1 FOR UPDATE',
        [issue_id]
      );

      if (issue.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: 'Issue record not found or already returned' });
      }

      // Fine Calculation
      const rDate = new Date(return_date);
      const dDate = new Date(issue[0].due_date);
      let fine_amount = 0;
      
      if (rDate > dDate) {
        const diffTime = Math.abs(rDate.getTime() - dDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        fine_amount = diffDays * 1; // Assuming 1 unit currency ($1/Rs.1) per day
      }

      await connection.query(
        'UPDATE issued_books SET status = "returned", return_date = ?, fine_amount = ? WHERE id = ?',
        [return_date, fine_amount, issue_id]
      );

      await connection.query(
        'UPDATE book_copies SET status = "available" WHERE id = ?',
        [issue[0].copy_id]
      );

      await syncBookAvailability(connection, issue[0].book_id);
      await connection.commit();

      // Send Email Alert
      const [retUser] = await connection.query('SELECT email, name FROM users WHERE id = ?', [issue[0].user_id]);
      const [retBook] = await connection.query(
        `SELECT b.title, bc.copy_number, bc.copy_code
         FROM books b
         JOIN book_copies bc ON bc.id = ?
         WHERE b.id = ?`,
        [issue[0].copy_id, issue[0].book_id]
      );
      
      if (retUser.length > 0 && retBook.length > 0 && retUser[0].email) {
        let emailText = `Hello ${retUser[0].name}, you successfully returned '${retBook[0].title}' (Copy No: ${retBook[0].copy_number}, Code: ${retBook[0].copy_code}).`;
        let emailHtml = `<p>Hello <b>${retUser[0].name}</b>,</p><p>You have successfully returned <b>${retBook[0].title}</b> (Copy No: <b>${retBook[0].copy_number}</b>, Code: <b>${retBook[0].copy_code}</b>).</p>`;
        
        if (fine_amount > 0) {
          emailText += ` Note: A late fine of $${fine_amount} has been applied. Please pay it to the counter.`;
          emailHtml += `<p style="color:red;"><b>Note:</b> A late fine of <b>$${fine_amount}</b> was applied due to late return.</p>`;
        }
        
        sendEmail(
          retUser[0].email,
          'Book Returned - Library Management',
          emailText,
          emailHtml
        );
      }

      res.json({ message: 'Book returned successfully', fine_amount });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user's issued books
const getUserIssuedBooks = async (req, res) => {
  try {
    const { user_id } = req.params;

    const connection = await pool.getConnection();
    const [issuedBooks] = await connection.query(
      `SELECT ib.*, b.title, b.author, bc.copy_number, bc.copy_code
       FROM issued_books ib
       JOIN books b ON ib.book_id = b.id
       JOIN book_copies bc ON ib.copy_id = bc.id
       WHERE ib.user_id = ?
       ORDER BY ib.issued_date DESC`,
      [user_id]
    );
    connection.release();

    res.json(issuedBooks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get dashboard stats
const getDashboardStats = async (req, res) => {
  try {
    const timeRange = req.query.timeRange || 'Monthly';
    const activityRange = req.query.activityRange || 'Last 7 Days';
    const is30Days = activityRange === 'Last 30 Days';
    const intervalDays = is30Days ? 29 : 6;

    const connection = await pool.getConnection();

    const [totalBooks] = await connection.query('SELECT IFNULL(SUM(total_quantity), 0) as count FROM books');
    const [totalUsers] = await connection.query('SELECT COUNT(*) as count FROM users');
    const [issuedBooks] = await connection.query(
      'SELECT COUNT(*) as count FROM issued_books WHERE status = "issued"'
    );
    const [returnedBooks] = await connection.query(
      'SELECT COUNT(*) as count FROM issued_books WHERE status = "returned"'
    );

    // Overdue and new students dynamically
    const [overdue] = await connection.query('SELECT COUNT(*) as count FROM issued_books WHERE status = "issued" AND due_date < CURRENT_DATE()');
    
    // New students based on timeRange
    const timeInterval = timeRange === 'Yearly' ? '1 YEAR' : '1 MONTH';
    const [newStudents] = await connection.query(`SELECT COUNT(*) as count FROM users WHERE role = "student" AND created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL ${timeInterval})`);

    // Advanced dynamic chart data
    const [activity] = await connection.query(`
      SELECT 
        DATE(activity_date) as activity_date,
        SUM(issued_count) as issued,
        SUM(returned_count) as returned
      FROM (
        SELECT DATE(issued_date) as activity_date, 1 as issued_count, 0 as returned_count
        FROM issued_books WHERE issued_date >= DATE_SUB(CURRENT_DATE(), INTERVAL ${intervalDays} DAY)
        UNION ALL
        SELECT DATE(return_date) as activity_date, 0 as issued_count, 1 as returned_count
        FROM issued_books WHERE status = 'returned' AND return_date >= DATE_SUB(CURRENT_DATE(), INTERVAL ${intervalDays} DAY)
      ) as combined
      GROUP BY DATE(activity_date)
      ORDER BY DATE(activity_date) ASC
    `);

    // Ensure all days are always populated even if no activity
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const chartData = [];
    for (let i = intervalDays; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = days[d.getDay()];
      const shortDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      const found = activity.find(a => {
        const aDate = new Date(a.activity_date);
        return aDate.getDate() === d.getDate() && aDate.getMonth() === d.getMonth() && aDate.getFullYear() === d.getFullYear();
      });

      chartData.push({
        name: is30Days ? shortDate : dayName,
        issued: found ? Number(found.issued) : 0,
        returned: found ? Number(found.returned) : 0
      });
    }

    connection.release();

    res.json({
      totalBooks: totalBooks[0].count,
      totalUsers: totalUsers[0].count,
      issuedBooks: issuedBooks[0].count,
      returnedBooks: returnedBooks[0].count,
      overdueBooks: overdue[0].count,
      newStudents: newStudents[0].count,
      chartData
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAllIssuedBooks,
  issueBook,
  returnBook,
  getUserIssuedBooks,
  getDashboardStats,
};
