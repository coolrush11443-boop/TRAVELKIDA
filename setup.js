const mysql = require('mysql2/promise');
require('dotenv').config();

const setupDatabase = async () => {
    console.log('🚀 Setting up ExploreEase Database...');

    try {
        // Connect to MySQL without database
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || ''
        });

        // Create database
        await connection.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
        console.log(`✅ Database '${process.env.DB_NAME}' created/verified`);

        // Use database - correct method!
        await connection.changeUser({ database: process.env.DB_NAME });

        // Create tables
        console.log('📊 Creating tables...');

        // Users table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('user', 'admin') DEFAULT 'user',
                phone VARCHAR(15),
                avatar VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_email (email),
                INDEX idx_role (role)
            )
        `);

        // Travel packages table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS travel_packages (
                id INT PRIMARY KEY AUTO_INCREMENT,
                title VARCHAR(200) NOT NULL,
                location VARCHAR(100) NOT NULL,
                duration VARCHAR(50) NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                rating DECIMAL(2,1) DEFAULT 0.0,
                category VARCHAR(50) NOT NULL,
                description TEXT,
                image_url VARCHAR(500),
                includes JSON,
                activities JSON,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_category (category),
                INDEX idx_price (price),
                INDEX idx_rating (rating)
            )
        `);

        // Bookings table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS bookings (
                id INT PRIMARY KEY AUTO_INCREMENT,
                booking_id VARCHAR(20) UNIQUE NOT NULL,
                user_id INT NOT NULL,
                package_id INT NOT NULL,
                checkin_date DATE NOT NULL,
                checkout_date DATE NOT NULL,
                adults INT NOT NULL DEFAULT 1,
                children INT DEFAULT 0,
                hotel_category ENUM('standard', 'deluxe', 'premium', 'luxury') DEFAULT 'standard',
                transport_mode ENUM('bus', 'train', 'flight') DEFAULT 'bus',
                special_requests TEXT,
                total_price DECIMAL(10,2) NOT NULL,
                status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
                payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
                booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (package_id) REFERENCES travel_packages(id) ON DELETE CASCADE,
                INDEX idx_booking_id (booking_id),
                INDEX idx_user_id (user_id),
                INDEX idx_package_id (package_id),
                INDEX idx_status (status)
            )
        `);

        // Booking activities table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS booking_activities (
                id INT PRIMARY KEY AUTO_INCREMENT,
                booking_id INT NOT NULL,
                activity_name VARCHAR(100) NOT NULL,
                activity_price DECIMAL(10,2) NOT NULL,
                FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
            )
        `);

        // Contact queries table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS contact_queries (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL,
                phone VARCHAR(15),
                subject VARCHAR(200),
                message TEXT NOT NULL,
                status ENUM('new', 'in_progress', 'replied', 'closed') DEFAULT 'new',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_status (status),
                INDEX idx_created_at (created_at)
            )
        `);

        console.log('✅ All tables created successfully');

        // Insert sample data
        console.log('📦 Inserting sample data...');

        // Check if admin user exists
        const [adminExists] = await connection.execute(
            'SELECT id FROM users WHERE email = ?', 
            ['admin@exploreease.com']
        );

        if (adminExists.length === 0) {
            // Insert admin user (password will be hashed in production)
            await connection.execute(`
                INSERT INTO users (name, email, password, role) VALUES 
                ('Admin User', 'admin@exploreease.com', 'admin123', 'admin')
            `);

            // Insert sample user
            await connection.execute(`
                INSERT INTO users (name, email, password, role, phone) VALUES 
                ('John Doe', 'user@example.com', 'user123', 'user', '+91 98765 43210')
            `);

            console.log('✅ Sample users created');
        }

        // Check if packages exist
        const [packagesExist] = await connection.execute('SELECT id FROM travel_packages LIMIT 1');

        if (packagesExist.length === 0) {
            // Insert sample travel packages
            const packages = [
                ['Goa Beach Paradise', 'Goa, India', '4 Days 3 Nights', 15999.00, 4.8, 'Beach', 
                 'Experience the beauty of Goa with pristine beaches, water sports, and vibrant nightlife. Perfect for couples and groups looking for a fun-filled vacation.',
                 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?ixlib=rb-4.0.3',
                 '["Hotel Stay", "Breakfast", "Airport Transfer", "Beach Activities"]',
                 '["Beach Sports", "Water Sports", "Nightlife"]'],

                ['Himalayan Adventure Trek', 'Himachal Pradesh, India', '7 Days 6 Nights', 28999.00, 4.9, 'Adventure',
                 'Embark on an unforgettable journey through the majestic Himalayas. Experience breathtaking views and connect with nature.',
                 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3',
                 '["Camping Equipment", "Professional Guide", "All Meals", "Transportation"]',
                 '["Trekking", "Camping", "Photography"]'],

                ['Kerala Backwaters Cruise', 'Kerala, India', '5 Days 4 Nights', 22999.00, 4.7, 'Nature',
                 'Relax in the serene backwaters of Kerala with traditional houseboats. Experience authentic Kerala culture and cuisine.',
                 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?ixlib=rb-4.0.3',
                 '["Houseboat Stay", "All Meals", "Ayurveda Treatment", "Local Sightseeing"]',
                 '["Houseboat Cruise", "Ayurveda Spa", "Cultural Tours"]'],

                ['Rajasthan Royal Heritage', 'Rajasthan, India', '6 Days 5 Nights', 31999.00, 4.8, 'Heritage',
                 'Explore the royal heritage of Rajasthan with magnificent palaces and desert safaris. Journey through the land of kings.',
                 'https://images.unsplash.com/photo-1599661046289-e31897846e41?ixlib=rb-4.0.3',
                 '["Heritage Hotel Stay", "All Meals", "Palace Entry Tickets", "Camel Safari"]',
                 '["Palace Tours", "Camel Safari", "Cultural Shows"]'],

                ['Manali Snow Adventure', 'Manali, India', '6 Days 5 Nights', 24999.00, 4.6, 'Adventure',
                 'Experience the thrill of snow-capped mountains with skiing, snowboarding, and winter sports in beautiful Manali.',
                 'https://images.unsplash.com/photo-1506195253600-d0625b2d15a4?ixlib=rb-4.0.3',
                 '["Hotel Stay", "All Meals", "Adventure Equipment", "Local Transport"]',
                 '["Skiing", "Snowboarding", "Mountain Climbing", "Photography"]'],

                ['Andaman Island Paradise', 'Andaman Islands, India', '8 Days 7 Nights', 45999.00, 4.9, 'Beach',
                 'Discover pristine beaches, crystal clear waters, and amazing marine life in the beautiful Andaman Islands.',
                 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?ixlib=rb-4.0.3',
                 '["Resort Stay", "All Meals", "Airport Transfer", "Water Sports", "Island Hopping"]',
                 '["Scuba Diving", "Snorkeling", "Jet Skiing", "Island Tours"]']
            ];

            for (const pkg of packages) {
                await connection.execute(`
                    INSERT INTO travel_packages 
                    (title, location, duration, price, rating, category, description, image_url, includes, activities) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, pkg);
            }

            console.log('✅ Sample packages created');
        }

        await connection.end();
        console.log('🎉 Database setup completed successfully!');
        console.log('🚀 You can now run: npm start');

    } catch (error) {
        console.error('❌ Database setup failed:', error);
        process.exit(1);
    }
};

setupDatabase();
