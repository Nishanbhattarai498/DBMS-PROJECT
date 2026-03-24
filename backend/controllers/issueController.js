const pool = require('../config/database'); // Import MySQL connection pool
const { sendEmail } = require('../utils/mailer'); // Import the email dispatcher

// Helper Function: Keeps the main `books` table's 'available_quantity' in sync 
// with the actual physical copies counted in `book_copies` table.
const syncBookAvailability = async (connection, bookId) => {
  // 1. Count how many physical copies have status "available"
  const [availableResult] = await connection.query(
    'SELECT COUNT(*) as count FROM book_copies WHERE book_id = ? AND status = "available"',
    [bookId]
  );

  // 2. Update the parent 'books' table with this new count
  await connection.query(
    'UPDATE books SET available_quantity = ? WHERE id = ?',
    [availableResult[0].count, bookId]
  );
};

// ==========================================
// 1. GET ALL ISSUED BOOKS (For Admin Dashboard)
// ==========================================
const getAllIssuedBooks = async (req, res) => {
  try {
    // Collect pagination limits and a status filter ('all', 'issued', 'returned')
    const { status = 'all', page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // A large JOIN query combining 4 tables to get full context of the checkout:
    // issued_books (the transaction), books (the title), book_copies (the physical item), users (the student)
    let query = `SELECT ib.*, b.title, b.author, bc.copy_number, bc.copy_code, u.name as student_name, u.email
                 FROM issued_books ib
                 JOIN books b ON ib.book_id = b.id
                 JOIN book_copies bc ON ib.copy_id = bc.id
                 JOIN users u ON ib.user_id = u.id`;
    
    let countQuery = `SELECT COUNT(*) as total FROM issued_books`;
    let params = [];

    // Filter by specific status if requested (e.g. only show books currently "issued")
    if (status !== 'all') {
      query += ' WHERE ib.status = ?';
      countQuery += ' WHERE status = ?';
      params.push(status);
    }

    const connection = await pool.getConnection();
    
    // Get total count for frontend math
    const [countResult] = await connection.query(countQuery, params);
    const total = countResult[0].total;

    // Apply ordering (newest first) and limit/offset for performance
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

// ==========================================
// 2. ISSUE A BOOK TO A USER (Checkout)
// ==========================================
const issueBook = async (req, res) => {
  try {
    // Extract variables from the checkout form
    const { book_id, copy_id, copy_number, user_id, issue_date, due_date } = req.body;
    const requestedCopyNumber = copy_number !== undefined && copy_number !== null && String(copy_number).trim() !== ''
      ? parseInt(copy_number, 10)
      : null;

    // Validate that we have enough information to perform a checkout
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
      // Begin robust database transaction
      await connection.beginTransaction();

      // Ensure the user actually exists
      const [user] = await connection.query('SELECT * FROM users WHERE id = ?', [user_id]);
      if (user.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: 'User not found' });
      }

      let selectedCopy;

      // THREE DIFFERENT WAYS TO SELECT WHICH PHYSICAL BOOK TO ISSUE:
      
      // Scenario A: Admin specifically scanned a unique 'copy_id'
      if (copy_id) {
        // Fetch it, ensure it's available, and lock the row
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
      } 
      // Scenario B: Admin specified the generic book ID and a specific physical copy number (e.g. Copy #3)
      else if (requestedCopyNumber !== null) {
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
      } 
      // Scenario C: Admin just selected a book, DB automatically picks the first available copy!
      else {
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

      // Final check: Prevent a student from checking out the exact same book title twice simultaneously
      const [existingIssue] = await connection.query(
        'SELECT id FROM issued_books WHERE book_id = ? AND user_id = ? AND status = "issued" LIMIT 1',
        [selectedCopy.book_id, user_id]
      );

      if (existingIssue.length > 0) {
        await connection.rollback();
        return res.status(400).json({ message: 'User already has this book issued' });
      }

      // EXECUTE CHECKOUT:
      // 1. Record the transaction
      await connection.query(
        'INSERT INTO issued_books (copy_id, book_id, user_id, issued_date, due_date) VALUES (?, ?, ?, ?, ?)',
        [selectedCopy.copy_id, selectedCopy.book_id, user_id, issue_date, due_date]
      );

      // 2. Change the physical copy status to "issued" (it is now off the shelf)
      await connection.query(
        'UPDATE book_copies SET status = "issued" WHERE id = ?',
        [selectedCopy.copy_id]
      );

      // 3. Fire the helper function to update the main inventory number counter
      await syncBookAvailability(connection, selectedCopy.book_id);
      
      // Permanently save DB changes
      await connection.commit();

      // OPTIONAL EMAIL INTEGRATION: Dispatch an email to notify the user of their new checkout
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

// ==========================================
// 3. RETURN A BOOK
// ==========================================
const returnBook = async (req, res) => {
  try {
    const { issue_id, return_date } = req.body;

    if (!issue_id || !return_date) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Fetch the specific open transaction and lock it
      const [issue] = await connection.query(
        'SELECT * FROM issued_books WHERE id = ? AND status = "issued" LIMIT 1 FOR UPDATE',
        [issue_id]
      );

      if (issue.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: 'Issue record not found or already returned' });
      }

      // ===========================
      // LATE FINE CALCULATION LOGIC
      // ===========================
      const rDate = new Date(return_date);
      const dDate = new Date(issue[0].due_date);
      let fine_amount = 0;
      
      // If the current returning date is past the required due date
      if (rDate > dDate) {
        // Calculate millisecond difference
        const diffTime = Math.abs(rDate.getTime() - dDate.getTime());
        // Convert to days
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        fine_amount = diffDays * 1; // Formula applies a fine of $1/Rs.1 per day
      }

      // EXECUTE RETURN:
      // 1. Mark transaction as returned, save the actual return date, and save the assessed fine
      await connection.query(
        'UPDATE issued_books SET status = "returned", return_date = ?, fine_amount = ? WHERE id = ?',
        [return_date, fine_amount, issue_id]
      );

      // 2. Put the physical book copy back on the shelf (status = 'available')
      await connection.query(
        'UPDATE book_copies SET status = "available" WHERE id = ?',
        [issue[0].copy_id]
      );

      // 3. Re-calculate total library inventory counter
      await syncBookAvailability(connection, issue[0].book_id);
      await connection.commit();

      // Dispatch Email Notification regarding the successful return + fine warning if applicable
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

      // Let the frontend know so it can display the fine modal immediately
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

// ==========================================
// 4. GET A SPECIFIC USER'S HISTORY
// ==========================================
const getUserIssuedBooks = async (req, res) => {
  try {
    const { user_id } = req.params;
    
    // Fetch all checkouts (active and returned) for a single student profile
    const query = `
      SELECT ib.*, b.title, b.author, bc.copy_number, bc.copy_code 
      FROM issued_books ib 
      JOIN books b ON ib.book_id = b.id 
      JOIN book_copies bc ON ib.copy_id = bc.id 
      WHERE ib.user_id = ? 
      ORDER BY ib.created_at DESC
    `;
    
    const [issuedBooks] = await pool.query(query, [user_id]);
    res.json(issuedBooks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ==========================================
// 5. GET MACRO DASHBOARD STATISTICS 
// ==========================================
const getDashboardStats = async (req, res) => {
  try {
    // Total physical books
    const [totalBooks] = await pool.query('SELECT SUM(total_quantity) as total FROM books');
    // Total students registered
    const [totalStudents] = await pool.query('SELECT COUNT(*) as total FROM users WHERE role = "student"');
    // Currently checked out books
    const [activeIssues] = await pool.query('SELECT COUNT(*) as total FROM issued_books WHERE status = "issued"');
    // Books that are returned
    const [returnedBooks] = await pool.query('SELECT COUNT(*) as total FROM issued_books WHERE status = "returned"');
    // Books that are checked out AND past their due date
    const [overdueBooks] = await pool.query('SELECT COUNT(*) as total FROM issued_books WHERE status = "issued" AND due_date < CURRENT_DATE');
    // New students in the last 7 days
    const [newStudents] = await pool.query('SELECT COUNT(*) as total FROM users WHERE role = "student" AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)');

    // Generate chart data for the last 7 days
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const chartDataMap = {};
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = days[d.getDay()];
      chartDataMap[dateStr] = { name: dayName, issued: 0, returned: 0 };
    }

    // Fetch activity for the last 7 days
    const [recentActivity] = await pool.query(`
      SELECT issued_date, return_date, status 
      FROM issued_books 
      WHERE issued_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
         OR (status = 'returned' AND return_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY))
    `);

    // Aggregate counts by date
    recentActivity.forEach(record => {
      if (record.issued_date) {
        const iDate = new Date(record.issued_date).toISOString().split('T')[0];
        if (chartDataMap[iDate]) {
          chartDataMap[iDate].issued += 1;
        }
      }
      if (record.status === 'returned' && record.return_date) {
        const rDate = new Date(record.return_date).toISOString().split('T')[0];
        if (chartDataMap[rDate]) {
          chartDataMap[rDate].returned += 1;
        }
      }
    });

    const chartData = Object.values(chartDataMap);

    // Return the specific object keys exactly matching what the frontend expects
    res.json({
      totalBooks: Number(totalBooks[0].total) || 0,
      totalUsers: Number(totalStudents[0].total) || 0,
      issuedBooks: Number(activeIssues[0].total) || 0,
      returnedBooks: Number(returnedBooks[0].total) || 0,
      overdueBooks: Number(overdueBooks[0].total) || 0,
      newStudents: Number(newStudents[0].total) || 0,
      chartData
    });
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ message: 'Server error retrieving dashboard stats' });
  }
};

module.exports = { getAllIssuedBooks, issueBook, returnBook, getUserIssuedBooks, getDashboardStats };
