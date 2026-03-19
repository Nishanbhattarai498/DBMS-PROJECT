const pool = require('../config/database');
const { sendEmail } = require('../utils/mailer');

// Get all issued books
const getAllIssuedBooks = async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = `SELECT ib.*, b.title, b.author, u.name as student_name, u.email
                 FROM issued_books ib
                 JOIN books b ON ib.book_id = b.id
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
    const { book_id, user_id, issue_date, due_date } = req.body;

    if (!book_id || !user_id || !issue_date || !due_date) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const connection = await pool.getConnection();

    // Check if book exists and has available quantity
    const [book] = await connection.query('SELECT * FROM books WHERE id = ?', [book_id]);
    if (book.length === 0) {
      connection.release();
      return res.status(404).json({ message: 'Book not found' });
    }

    if (book[0].available_quantity <= 0) {
      connection.release();
      return res.status(400).json({ message: 'Book not available' });
    }

    // Check if user exists
    const [user] = await connection.query('SELECT * FROM users WHERE id = ?', [user_id]);
    if (user.length === 0) {
      connection.release();
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user already has this book issued
    const [existingIssue] = await connection.query(
      'SELECT * FROM issued_books WHERE book_id = ? AND user_id = ? AND status = "issued"',
      [book_id, user_id]
    );

    if (existingIssue.length > 0) {
      connection.release();
      return res.status(400).json({ message: 'User already has this book issued' });
    }

    // Create issue record
    await connection.query(
      'INSERT INTO issued_books (book_id, user_id, issued_date, due_date) VALUES (?, ?, ?, ?)',
      [book_id, user_id, issue_date, due_date]
    );

    // Update available quantity
    await connection.query(
      'UPDATE books SET available_quantity = available_quantity - 1 WHERE id = ?',
      [book_id]
    );

    // Send Email Alert
    if (user[0].email) {
      sendEmail(
        user[0].email,
        'Book Issued Successfully - Library Management',
        `Hello ${user[0].name}, you have been issued '${book[0].title}'. Please return it by ${due_date}.`,
        `<h3>Library Management System</h3>
         <p>Hello <b>${user[0].name}</b>,</p>
         <p>You have been issued <b>${book[0].title}</b>.</p>
         <p>Please note that the <b>due date is ${due_date}</b>.</p>`
      );
    }

    connection.release();
    res.status(201).json({ message: 'Book issued successfully' });
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

    // Get issue record
    const [issue] = await connection.query(
      'SELECT * FROM issued_books WHERE id = ? AND status = "issued"',
      [issue_id]
    );

    if (issue.length === 0) {
      connection.release();
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

    // Update issue record
    await connection.query(
      'UPDATE issued_books SET status = "returned", return_date = ?, fine_amount = ? WHERE id = ?',
      [return_date, fine_amount, issue_id]
    );

    // Update available quantity
    await connection.query(
      'UPDATE books SET available_quantity = available_quantity + 1 WHERE id = ?',
      [issue[0].book_id]
    );

    // Send Email Alert
    const [retUser] = await connection.query('SELECT email, name FROM users WHERE id = ?', [issue[0].user_id]);
    const [retBook] = await connection.query('SELECT title FROM books WHERE id = ?', [issue[0].book_id]);
    
    if (retUser.length > 0 && retBook.length > 0 && retUser[0].email) {
      let emailText = `Hello ${retUser[0].name}, you successfully returned '${retBook[0].title}'.`;
      let emailHtml = `<p>Hello <b>${retUser[0].name}</b>,</p><p>You have successfully returned <b>${retBook[0].title}</b>.</p>`;
      
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

    connection.release();
    res.json({ message: 'Book returned successfully', fine_amount });
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
      `SELECT ib.*, b.title, b.author
       FROM issued_books ib
       JOIN books b ON ib.book_id = b.id
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
