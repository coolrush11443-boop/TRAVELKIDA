# ExploreEase Travel Booking System

A modern, full-stack travel booking system built with Node.js, Express, MySQL, and vanilla JavaScript.

## 🚀 Features

### Frontend
- **Responsive Design**: Beautiful, mobile-first responsive interface
- **Modern UI**: Clean, professional design with smooth animations
- **User Authentication**: Secure login/registration system
- **Package Discovery**: Browse and search travel packages with filters
- **Booking System**: Complete booking flow with customization options
- **Payment Integration**: QR code and multiple payment method support
- **User Dashboard**: Manage bookings and profile (coming soon)

### Backend
- **RESTful APIs**: Well-structured API endpoints
- **JWT Authentication**: Secure token-based authentication
- **MySQL Database**: Robust relational database with proper schemas
- **Input Validation**: Comprehensive input validation and sanitization
- **Error Handling**: Proper error handling and logging
- **Security**: SQL injection protection and CORS support

### Admin Panel
- **Dashboard**: Real-time statistics and analytics
- **Booking Management**: View and manage all bookings
- **Package Management**: Manage travel packages
- **User Management**: View and manage registered users

## 📦 Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MySQL 8.0+
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Authentication**: JWT (JSON Web Tokens)
- **Payment**: QR Code integration (UPI support)
- **Styling**: Modern CSS with CSS Variables
- **Icons**: Font Awesome 6

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 16+ and npm
- MySQL 8.0+
- Git (optional)

### Step-by-Step Setup

1. **Extract the project files**
   ```bash
   unzip ExploreEase_NodeJS_Project.zip
   cd exploreease-travel-booking
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   - Copy `.env` file and update database credentials if needed
   - Default configuration works with standard MySQL installation

4. **Setup database**
   ```bash
   npm run setup
   ```
   This will:
   - Create the `exploreease_travel` database
   - Create all necessary tables
   - Insert sample data (packages, admin user, test user)

5. **Start the server**
   ```bash
   npm start
   ```

   For development with auto-reload:
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Open your browser and go to: `http://localhost:3000`
   - The application will be running with sample data

## 👤 Demo Accounts

### Regular User
- **Email**: user@example.com
- **Password**: user123

### Admin User
- **Email**: admin@exploreease.com
- **Password**: admin123

## 🗄️ Database Schema

The system uses 5 main tables:

1. **users** - User accounts and authentication
2. **travel_packages** - Travel packages with details
3. **bookings** - User bookings with full information
4. **booking_activities** - Additional activities per booking
5. **contact_queries** - Contact form submissions

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile (requires auth)

### Packages
- `GET /api/packages` - Get all packages (with filters)
- `GET /api/packages/:id` - Get single package
- `GET /api/packages/meta/categories` - Get package categories
- `GET /api/packages/meta/stats` - Get package statistics

### Bookings
- `POST /api/bookings` - Create new booking (requires auth)
- `GET /api/bookings/my-bookings` - Get user bookings (requires auth)
- `GET /api/bookings/:bookingId` - Get single booking (requires auth)
- `PATCH /api/bookings/:bookingId/status` - Update booking status (requires auth)
- `DELETE /api/bookings/:bookingId` - Cancel booking (requires auth)

### Admin
- `GET /api/admin/dashboard/stats` - Get admin statistics (requires admin auth)
- `GET /api/admin/bookings` - Get all bookings (requires admin auth)
- `GET /api/admin/users` - Get all users (requires admin auth)
- `GET /api/admin/packages` - Get all packages with stats (requires admin auth)
- `PATCH /api/admin/bookings/:id/status` - Update booking status (requires admin auth)

## 🔧 Configuration

### Environment Variables (`.env`)
```
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=exploreease_travel

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Secret (change in production)
JWT_SECRET=exploreease_super_secret_key_2025
```

### Package.json Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with auto-reload
- `npm run setup` - Setup database and initial data

## 🎨 Customization

### Adding New Packages
1. Use the admin panel (coming soon)
2. Or directly insert into the database:
```sql
INSERT INTO travel_packages (title, location, duration, price, rating, category, description, image_url, includes, activities) 
VALUES ('Your Package', 'Location', '5 Days', 25000.00, 4.5, 'Adventure', 'Description', 'image_url', '["Item1", "Item2"]', '["Activity1", "Activity2"]');
```

### Styling Customization
- Edit `public/styles.css`
- CSS variables are defined at the top for easy theme customization
- Responsive breakpoints are included

### Adding Payment Gateways
- Extend the payment modal in `public/app.js`
- Add new payment method handling in the booking flow
- Integrate with Razorpay, Stripe, or other payment providers

## 🚀 Production Deployment

### Prerequisites for Production
1. **Security**:
   - Change JWT_SECRET to a strong, unique value
   - Implement password hashing with bcrypt
   - Add rate limiting and request validation
   - Use HTTPS for all connections

2. **Database**:
   - Use a production MySQL instance
   - Implement proper backup strategies
   - Add database connection pooling

3. **Server**:
   - Use PM2 for process management
   - Set up reverse proxy (Nginx)
   - Configure logging and monitoring

### Deployment Steps
1. **Prepare Environment**:
   ```bash
   NODE_ENV=production
   npm install --production
   ```

2. **Database Setup**:
   ```bash
   npm run setup
   ```

3. **Start with PM2**:
   ```bash
   npm install -g pm2
   pm2 start server.js --name exploreease
   pm2 save
   pm2 startup
   ```

## 📱 Mobile Support

The application is fully responsive and supports:
- iOS Safari 12+
- Android Chrome 70+
- Modern mobile browsers
- Progressive Web App features (can be added)

## 🔍 Testing

### Manual Testing Checklist
- [ ] User registration and login
- [ ] Package browsing and filtering
- [ ] Package booking flow
- [ ] Payment process
- [ ] Admin login and dashboard
- [ ] Responsive design on mobile
- [ ] Error handling

### API Testing
Use tools like Postman or curl to test API endpoints:
```bash
# Login
curl -X POST http://localhost:3000/api/auth/login   -H "Content-Type: application/json"   -d '{"email":"user@example.com","password":"user123"}'

# Get packages
curl http://localhost:3000/api/packages

# Create booking (requires auth token)
curl -X POST http://localhost:3000/api/bookings   -H "Content-Type: application/json"   -H "Authorization: Bearer YOUR_TOKEN"   -d '{"packageId":1,"checkinDate":"2025-12-01","checkoutDate":"2025-12-05","adults":2,"totalPrice":31998}'
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📧 Support

For support, email: support@exploreease.com
Or create an issue in the repository.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🎯 Future Enhancements

- [ ] Real-time chat support
- [ ] Advanced search with maps
- [ ] Multi-language support
- [ ] Mobile app development
- [ ] AI-powered recommendations
- [ ] Social media integration
- [ ] Review and rating system
- [ ] Loyalty program
- [ ] Advanced analytics dashboard
- [ ] Email notifications
- [ ] SMS alerts
- [ ] PDF ticket generation

---

Built with ❤️ for amazing travel experiences!
