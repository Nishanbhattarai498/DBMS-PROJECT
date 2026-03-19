const fs = require('fs');
const path = 'c:/DBMS-PROJECT/backend/controllers/issueController.js';
let content = fs.readFileSync(path, 'utf8');

const regex = /\/\/ Get dashboard stats[\s\S]+?module\.exports = \{/;

const replacement = \// Get dashboard stats
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
    const [newStudents] = await connection.query(\\\SELECT COUNT(*) as count FROM users WHERE role = "student" AND created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL \\\)\\\);

    // Advanced dynamic chart data
    const [activity] = await connection.query(\\\
      SELECT 
        DATE(activity_date) as activity_date,
        SUM(issued_count) as issued,
        SUM(returned_count) as returned
      FROM (
        SELECT DATE(issued_date) as activity_date, 1 as issued_count, 0 as returned_count
        FROM issued_books WHERE issued_date >= DATE_SUB(CURRENT_DATE(), INTERVAL \\\ DAY)
        UNION ALL
        SELECT DATE(return_date) as activity_date, 0 as issued_count, 1 as returned_count
        FROM issued_books WHERE status = 'returned' AND return_date >= DATE_SUB(CURRENT_DATE(), INTERVAL \\\ DAY)
      ) as combined
      GROUP BY DATE(activity_date)
      ORDER BY DATE(activity_date) ASC
    \\\);

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

module.exports = {\;

if (content.match(regex)) {
  fs.writeFileSync(path, content.replace(regex, replacement), 'utf8');
  console.log('REPLACED SUCCESSFULLY');
} else {
  console.log('REGEX FAILED');
}
