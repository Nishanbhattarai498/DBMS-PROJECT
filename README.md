# Library Management System

A full-stack web application for managing library operations including books, users, and book issuances/returns.

## 📋 Features

### 1. **Authentication**
- Admin login/logout with JWT-based authentication
- Secure password hashing with bcrypt
- Session management

### 2. **Dashboard**
- Display statistics (total books, issued books, returned books, registered users)
- Interactive stats cards
- System overview

### 3. **Book Management**
- Add new books with details (title, author, category, ISBN, quantity)
- View all books in table format with pagination
- Update book information
- Delete books (with validation)
- Search and filter books by category
- Track available quantity

### 4. **User Management**
- Add student/user profiles (name, email, phone, address)
- View all users with pagination
- Update user information
- Delete users (with validation)
- Search functionality

### 5. **Issue/Return System**
- Issue books to users with issue and due dates
- Return books and automatically update inventory
- Track all book transactions
- View current issued books
- View transaction history

### 6. **Database Design**
- **Admin Table**: Stores admin credentials
- **Users Table**: Student/user information
- **Books Table**: Book inventory and details
- **Issued_Books Table**: Tracks all book transactions

## 🛠️ Tech Stack

- **Frontend**: React.js with Tailwind CSS
- **Backend**: Node.js with Express.js
- **Database**: MySQL
- **Authentication**: JWT (JSON Web Tokens)
- **Password Security**: bcryptjs

## 📁 Project Structure

```
DBMS-PROJECT/
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── bookController.js
│   │   ├── userController.js
│   │   └── issueController.js
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── bookRoutes.js
│   │   ├── userRoutes.js
│   │   └── issueRoutes.js
│   ├── .env
│   ├── .gitignore
│   ├── database.sql
│   ├── package.json
│   └── server.js
│
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   └── manifest.json
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.js
│   │   │   ├── Sidebar.js
│   │   │   └── StatCard.js
│   │   ├── pages/
│   │   │   ├── Login.js
│   │   │   ├── Dashboard.js
│   │   │   ├── Books.js
│   │   │   ├── Users.js
│   │   │   └── Issue.js
│   │   ├── utils/
│   │   │   ├── api.js
│   │   │   ├── auth.js
│   │   │   └── ProtectedRoute.js
│   │   ├── App.js
│   │   ├── App.css
│   │   ├── index.js
│   │   └── index.css
│   ├── .gitignore
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── public/
│       └── index.html
│
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MySQL Server (v5.7 or higher)
- npm or yarn

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create MySQL Database**
   - Open MySQL command line or workbench
   - Run the SQL script:
   ```bash
   mysql -u root -p < database.sql
   ```
   - Or copy the contents of `database.sql` and execute in MySQL

4. **Configure Environment Variables**
   - Edit `.env` file
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=library_management
   DB_PORT=3306
   
   JWT_SECRET=your_secret_key_here
   JWT_EXPIRE=7d
   
   PORT=5000
   NODE_ENV=development
   ```

5. **Hash Admin Password (Optional)**
   - If you want to change the default password, use this Node.js snippet:
   ```javascript
   const bcrypt = require('bcryptjs');
   bcrypt.hash('your_password', 10, (err, hash) => {
     console.log(hash);
   });
   ```
   - Update the hash in `database.sql`

6. **Start Backend Server**
   ```bash
   npm start
   # or for development with auto-reload
   npm run dev
   ```
   - Server will run on `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory** (in a new terminal)
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment (Optional)**
   - Create `.env` file in frontend root:
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   ```

4. **Start Development Server**
   ```bash
   npm start
   ```
   - Application will open at `http://localhost:3000` in your default browser

## 📝 Default Login Credentials

- **Username**: `admin`
- **Password**: `admin123`

⚠️ **Change these credentials in production!**

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login

### Books
- `GET /api/books` - Get all books (with pagination)
- `GET /api/books/:id` - Get book by ID
- `POST /api/books` - Add new book (requires authentication)
- `PUT /api/books/:id` - Update book (requires authentication)
- `DELETE /api/books/:id` - Delete book (requires authentication)

### Users
- `GET /api/users` - Get all users (with pagination)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Add new user (requires authentication)
- `PUT /api/users/:id` - Update user (requires authentication)
- `DELETE /api/users/:id` - Delete user (requires authentication)

### Issues
- `GET /api/issues` - Get all issued books
- `POST /api/issues/issue` - Issue a book
- `POST /api/issues/return` - Return a book
- `GET /api/issues/user/:user_id` - Get user's issued books
- `GET /api/issues/stats/dashboard` - Get dashboard statistics

## 🎨 UI Components

### Pages
- **Login Page**: Admin authentication interface
- **Dashboard**: System statistics and overview
- **Books Page**: Complete book management
- **Users Page**: User/student management
- **Issue/Return Page**: Book transaction management

### Features
- Responsive design (mobile, tablet, desktop)
- Clean modern UI with Tailwind CSS
- Sidebar navigation
- Pagination support
- Search and filter functionality
- Form validation
- Error handling
- Loading states

## 🔒 Security Features

- JWT token-based authentication
- Password hashing with bcryptjs
- Protected routes (frontend)
- Token verification middleware (backend)
- Secure database queries (parameterized)
- CORS enabled for cross-origin requests

## 📊 Database Schema

### Admin Table
```sql
- id (Primary Key)
- username (Unique)
- email (Unique)
- password (Hashed)
- created_at
```

### Users Table
```sql
- id (Primary Key)
- name
- email (Unique)
- phone
- address
- created_at
- updated_at
```

### Books Table
```sql
- id (Primary Key)
- title
- author
- category
- isbn (Unique)
- total_quantity
- available_quantity
- created_at
- updated_at
```

### Issued_Books Table
```sql
- id (Primary Key)
- book_id (Foreign Key)
- user_id (Foreign Key)
- issued_date
- due_date
- return_date
- status (issued/returned)
- created_at
- updated_at
```

## 🐛 Troubleshooting

### Database Connection Error
- Verify MySQL is running
- Check `.env` credentials
- Ensure database and tables are created

### CORS Error
- Backend should have CORS enabled (it does by default)
- Check API_URL in frontend `.env`

### Port Already in Use
- Backend: Change PORT in `.env`
- Frontend: Use `PORT=3001 npm start` to use different port

### Blank Login Page
- Check browser console for errors
- Verify frontend is connected to backend API
- Ensure backend server is running

## 📚 Learning Resources

- [React Documentation](https://react.dev)
- [Express.js Guide](https://expressjs.com)
- [MySQL Documentation](https://dev.mysql.com/doc)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [JWT Introduction](https://jwt.io/introduction)

## 🤝 Contributing

This is a college project. Feel free to expand features or modify as needed.

## 📄 License

This project is open source and available under the MIT License.

## 👨‍💻 Developer Notes

- **Backend**: Uses MySQL2 with connection pooling for better performance
- **Frontend**: Uses React Router v6 for navigation
- **UI**: Built with Tailwind CSS for rapid development
- **Authentication**: JWT tokens stored in localStorage
- **Database**: Includes indexes on frequently queried columns

## 🎯 Future Enhancements

- Email notifications for due dates
- Fine/penalty system
- Advanced reporting
- Book ratings and reviews
- User roles and permissions
- Two-factor authentication
- Book reservations
- Analytics dashboard

---

**Created for DBMS College Project** | **v1.0.0**
