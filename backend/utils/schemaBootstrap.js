const pool = require('../config/database');

const makeCopyCode = (isbn, bookId, seq) => {
  const cleanIsbn = String(isbn || 'BOOK').replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'BOOK';
  return `${cleanIsbn}-${bookId}-${String(seq).padStart(4, '0')}`;
};

const tableExists = async (connection, tableName) => {
  const [rows] = await connection.query(
    `SELECT COUNT(*) as count
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?`,
    [tableName]
  );
  return rows[0].count > 0;
};

const columnExists = async (connection, tableName, columnName) => {
  const [rows] = await connection.query(
    `SELECT COUNT(*) as count
     FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [tableName, columnName]
  );
  return rows[0].count > 0;
};

const indexExists = async (connection, tableName, indexName) => {
  const [rows] = await connection.query(
    `SELECT COUNT(*) as count
     FROM information_schema.statistics
     WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?`,
    [tableName, indexName]
  );
  return rows[0].count > 0;
};

const ensureBaseTables = async (connection) => {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS admin (
      id INT PRIMARY KEY AUTO_INCREMENT,
      username VARCHAR(50) NOT NULL UNIQUE,
      email VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL UNIQUE,
      phone VARCHAR(15) DEFAULT NULL,
      address VARCHAR(255) DEFAULT NULL,
      username VARCHAR(50) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role ENUM('admin', 'student') NOT NULL DEFAULT 'student',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS books (
      id INT PRIMARY KEY AUTO_INCREMENT,
      title VARCHAR(200) NOT NULL,
      author VARCHAR(100) NOT NULL,
      faculty VARCHAR(50) DEFAULT NULL,
      isbn VARCHAR(20) NOT NULL UNIQUE,
      total_quantity INT NOT NULL DEFAULT 1,
      available_quantity INT NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_book_isbn (isbn)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS student_profiles (
      user_id INT PRIMARY KEY,
      student_id VARCHAR(50) UNIQUE,
      semester INT,
      department VARCHAR(100),
      batch_year INT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_student_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  const hasBooksTotal = await columnExists(connection, 'books', 'total_quantity');
  if (!hasBooksTotal) {
    await connection.query('ALTER TABLE books ADD COLUMN total_quantity INT NOT NULL DEFAULT 1');
  }

  const hasBooksAvailable = await columnExists(connection, 'books', 'available_quantity');
  if (!hasBooksAvailable) {
    await connection.query('ALTER TABLE books ADD COLUMN available_quantity INT NOT NULL DEFAULT 1');
  }
};

const ensureCopyAndIssueTables = async (connection) => {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS book_copies (
      id INT PRIMARY KEY AUTO_INCREMENT,
      book_id INT NOT NULL,
      copy_number INT NOT NULL,
      copy_code VARCHAR(64) NOT NULL UNIQUE,
      status ENUM('available', 'issued', 'lost', 'damaged') NOT NULL DEFAULT 'available',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_copy_book_id (book_id),
      INDEX idx_copy_number (copy_number),
      INDEX idx_copy_status (status),
      UNIQUE KEY uq_copy_book_number (book_id, copy_number),
      CONSTRAINT fk_copy_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  const hasCopyNumber = await columnExists(connection, 'book_copies', 'copy_number');
  if (!hasCopyNumber) {
    await connection.query('ALTER TABLE book_copies ADD COLUMN copy_number INT NULL AFTER book_id');
  }

  const issuedExists = await tableExists(connection, 'issued_books');
  if (!issuedExists) {
    await connection.query(`
      CREATE TABLE issued_books (
        id INT PRIMARY KEY AUTO_INCREMENT,
        copy_id INT NULL,
        book_id INT NOT NULL,
        user_id INT NOT NULL,
        issued_date DATE NOT NULL,
        due_date DATE NOT NULL,
        return_date DATE DEFAULT NULL,
        status ENUM('issued', 'returned') NOT NULL DEFAULT 'issued',
        fine_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_issued_copy_id (copy_id),
        INDEX idx_issued_book_id (book_id),
        INDEX idx_issued_user_id (user_id),
        INDEX idx_issued_status (status),
        CONSTRAINT fk_issued_books_copy FOREIGN KEY (copy_id) REFERENCES book_copies(id) ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT fk_issued_books_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT fk_issued_books_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
  } else {
    const hasCopyId = await columnExists(connection, 'issued_books', 'copy_id');
    if (!hasCopyId) {
      await connection.query('ALTER TABLE issued_books ADD COLUMN copy_id INT NULL AFTER id');
      await connection.query('CREATE INDEX idx_issued_copy_id ON issued_books(copy_id)');
      await connection.query(
        'ALTER TABLE issued_books ADD CONSTRAINT fk_issued_books_copy FOREIGN KEY (copy_id) REFERENCES book_copies(id) ON DELETE RESTRICT ON UPDATE CASCADE'
      );
    }

    const hasIssuedDate = await columnExists(connection, 'issued_books', 'issued_date');
    if (!hasIssuedDate) {
      await connection.query('ALTER TABLE issued_books ADD COLUMN issued_date DATE NULL');
      const hasLegacyIssueDate = await columnExists(connection, 'issued_books', 'issue_date');
      if (hasLegacyIssueDate) {
        await connection.query('UPDATE issued_books SET issued_date = issue_date WHERE issued_date IS NULL');
      }
      await connection.query('UPDATE issued_books SET issued_date = CURRENT_DATE() WHERE issued_date IS NULL');
      await connection.query('ALTER TABLE issued_books MODIFY COLUMN issued_date DATE NOT NULL');
    }

    const hasDueDate = await columnExists(connection, 'issued_books', 'due_date');
    if (!hasDueDate) {
      await connection.query('ALTER TABLE issued_books ADD COLUMN due_date DATE NULL');
      await connection.query('UPDATE issued_books SET due_date = DATE_ADD(issued_date, INTERVAL 14 DAY) WHERE due_date IS NULL');
      await connection.query('ALTER TABLE issued_books MODIFY COLUMN due_date DATE NOT NULL');
    }

    const hasFineAmount = await columnExists(connection, 'issued_books', 'fine_amount');
    if (!hasFineAmount) {
      await connection.query('ALTER TABLE issued_books ADD COLUMN fine_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00');
    }

    const hasStatus = await columnExists(connection, 'issued_books', 'status');
    if (!hasStatus) {
      await connection.query('ALTER TABLE issued_books ADD COLUMN status ENUM("issued", "returned") NOT NULL DEFAULT "issued"');
    }
  }
};

const backfillBookCopies = async (connection) => {
  const [books] = await connection.query('SELECT id, isbn, total_quantity FROM books ORDER BY id ASC');

  for (const book of books) {
    const totalQuantity = Math.max(Number(book.total_quantity) || 1, 1);

    const [existingCopies] = await connection.query(
      'SELECT id FROM book_copies WHERE book_id = ? ORDER BY id ASC',
      [book.id]
    );

    for (let i = 0; i < existingCopies.length; i += 1) {
      const copyNumber = i + 1;
      await connection.query(
        'UPDATE book_copies SET copy_number = ?, copy_code = COALESCE(NULLIF(copy_code, ""), ?) WHERE id = ?',
        [copyNumber, makeCopyCode(book.isbn, book.id, copyNumber), existingCopies[i].id]
      );
    }

    const [copyCountRows] = await connection.query(
      'SELECT COUNT(*) as count FROM book_copies WHERE book_id = ?',
      [book.id]
    );

    const existingCount = copyCountRows[0].count;
    if (existingCount < totalQuantity) {
      const rowsToAdd = totalQuantity - existingCount;
      const insertRows = Array.from({ length: rowsToAdd }, (_, index) => [
        book.id,
        existingCount + index + 1,
        makeCopyCode(book.isbn, book.id, existingCount + index + 1),
      ]);

      const placeholders = insertRows.map(() => '(?, ?, ?)').join(', ');
      const values = insertRows.flat();

      await connection.query(
        `INSERT INTO book_copies (book_id, copy_number, copy_code) VALUES ${placeholders}`,
        values
      );
    }
  }

  const hasCopyNumberIndex = await indexExists(connection, 'book_copies', 'idx_copy_number');
  if (!hasCopyNumberIndex) {
    await connection.query('CREATE INDEX idx_copy_number ON book_copies(copy_number)');
  }

  const hasUniqueCopyBookNumber = await indexExists(connection, 'book_copies', 'uq_copy_book_number');
  if (!hasUniqueCopyBookNumber) {
    await connection.query('CREATE UNIQUE INDEX uq_copy_book_number ON book_copies(book_id, copy_number)');
  }

  const hasCopyNumberColumn = await columnExists(connection, 'book_copies', 'copy_number');
  if (hasCopyNumberColumn) {
    await connection.query('ALTER TABLE book_copies MODIFY COLUMN copy_number INT NOT NULL');
  }
};

const assignCopiesToLegacyIssues = async (connection) => {
  const hasCopyId = await columnExists(connection, 'issued_books', 'copy_id');
  if (!hasCopyId) {
    return;
  }

  const [legacyIssues] = await connection.query(
    `SELECT id, book_id
     FROM issued_books
     WHERE status = 'issued' AND (copy_id IS NULL OR copy_id = 0)
     ORDER BY id ASC`
  );

  for (const issue of legacyIssues) {
    const [availableCopyRows] = await connection.query(
      `SELECT id
       FROM book_copies
       WHERE book_id = ? AND status = 'available'
       ORDER BY id ASC
       LIMIT 1 FOR UPDATE`,
      [issue.book_id]
    );

    if (availableCopyRows.length === 0) {
      continue;
    }

    const copyId = availableCopyRows[0].id;
    await connection.query('UPDATE issued_books SET copy_id = ? WHERE id = ?', [copyId, issue.id]);
    await connection.query('UPDATE book_copies SET status = "issued" WHERE id = ?', [copyId]);
  }

  await connection.query(
    `UPDATE book_copies bc
     JOIN issued_books ib ON ib.copy_id = bc.id
     SET bc.status = 'issued'
     WHERE ib.status = 'issued'`
  );
};

const syncBookAvailability = async (connection) => {
  await connection.query(
    `UPDATE books b
     LEFT JOIN (
       SELECT book_id, COUNT(*) as available_count
       FROM book_copies
       WHERE status = 'available'
       GROUP BY book_id
     ) c ON c.book_id = b.id
     SET b.available_quantity = COALESCE(c.available_count, 0),
         b.total_quantity = GREATEST(b.total_quantity, COALESCE((SELECT COUNT(*) FROM book_copies x WHERE x.book_id = b.id), 0))`
  );
};

const bootstrapSchema = async () => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await ensureBaseTables(connection);
    await ensureCopyAndIssueTables(connection);
    await backfillBookCopies(connection);
    await assignCopiesToLegacyIssues(connection);
    await syncBookAvailability(connection);

    await connection.commit();
    console.log('Database schema bootstrap completed.');
  } catch (error) {
    await connection.rollback();
    console.error('Database schema bootstrap failed:', error.message);
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  bootstrapSchema,
};
