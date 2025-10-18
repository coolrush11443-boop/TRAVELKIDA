const express = require('express');
const jwt = require('jsonwebtoken');
const { query, queryOne } = require('../config/database');

const router = express.Router();

// Verify token middleware
const verifyToken = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access denied. No token provided.'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
};

// Generate unique booking ID
const generateBookingId = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `BK${timestamp}${random}`.toUpperCase();
};

// Create new booking
router.post('/', verifyToken, async (req, res) => {
    try {
        const {
            packageId,
            checkinDate,
            checkoutDate,
            adults,
            children = 0,
            hotelCategory = 'standard',
            transportMode = 'bus',
            specialRequests = '',
            totalPrice,
            activities = []
        } = req.body;

        // Validate required fields
        if (!packageId || !checkinDate || !checkoutDate || !adults || !totalPrice) {
            return res.status(400).json({
                success: false,
                message: 'Missing required booking details'
            });
        }

        // Validate dates
        const checkin = new Date(checkinDate);
        const checkout = new Date(checkoutDate);
        const today = new Date();

        if (checkin <= today) {
            return res.status(400).json({
                success: false,
                message: 'Check-in date must be in the future'
            });
        }

        if (checkout <= checkin) {
            return res.status(400).json({
                success: false,
                message: 'Check-out date must be after check-in date'
            });
        }

        // Verify package exists
        const packageExists = await queryOne(
            'SELECT id, title FROM travel_packages WHERE id = ? AND is_active = TRUE',
            [packageId]
        );

        if (!packageExists) {
            return res.status(404).json({
                success: false,
                message: 'Package not found'
            });
        }

        // Generate booking ID
        const bookingId = generateBookingId();

        // Insert booking
        const bookingResult = await query(`
            INSERT INTO bookings 
            (booking_id, user_id, package_id, checkin_date, checkout_date, adults, children, 
             hotel_category, transport_mode, special_requests, total_price, status, payment_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')
        `, [
            bookingId, req.user.userId, packageId, checkinDate, checkoutDate,
            adults, children, hotelCategory, transportMode, specialRequests, totalPrice
        ]);

        // Insert activities if any
        if (activities.length > 0) {
            for (const activity of activities) {
                await query(
                    'INSERT INTO booking_activities (booking_id, activity_name, activity_price) VALUES (?, ?, ?)',
                    [bookingResult.insertId, activity.name, activity.price]
                );
            }
        }

        res.status(201).json({
            success: true,
            message: 'Booking created successfully',
            booking: {
                id: bookingResult.insertId,
                bookingId,
                packageTitle: packageExists.title,
                totalPrice,
                status: 'pending'
            }
        });

    } catch (error) {
        console.error('Booking creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create booking',
            error: error.message
        });
    }
});

// Get user bookings
router.get('/my-bookings', verifyToken, async (req, res) => {
    try {
        const bookings = await query(`
            SELECT 
                b.id, b.booking_id, b.checkin_date, b.checkout_date, b.adults, b.children,
                b.hotel_category, b.transport_mode, b.special_requests, b.total_price,
                b.status, b.payment_status, b.booking_date, b.created_at,
                p.title as package_title, p.location as package_location, 
                p.duration as package_duration, p.image_url as package_image
            FROM bookings b
            JOIN travel_packages p ON b.package_id = p.id
            WHERE b.user_id = ?
            ORDER BY b.created_at DESC
        `, [req.user.userId]);

        // Get activities for each booking
        for (const booking of bookings) {
            const activities = await query(
                'SELECT activity_name, activity_price FROM booking_activities WHERE booking_id = ?',
                [booking.id]
            );
            booking.activities = activities;
        }

        res.json({
            success: true,
            bookings,
            count: bookings.length
        });

    } catch (error) {
        console.error('User bookings fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch bookings',
            error: error.message
        });
    }
});

// Get single booking
router.get('/:bookingId', verifyToken, async (req, res) => {
    try {
        const { bookingId } = req.params;

        const booking = await queryOne(`
            SELECT 
                b.*, 
                p.title as package_title, p.location as package_location, 
                p.duration as package_duration, p.image_url as package_image,
                p.description as package_description,
                u.name as user_name, u.email as user_email, u.phone as user_phone
            FROM bookings b
            JOIN travel_packages p ON b.package_id = p.id
            JOIN users u ON b.user_id = u.id
            WHERE b.booking_id = ? AND b.user_id = ?
        `, [bookingId, req.user.userId]);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // Get activities
        const activities = await query(
            'SELECT activity_name, activity_price FROM booking_activities WHERE booking_id = ?',
            [booking.id]
        );
        booking.activities = activities;

        res.json({
            success: true,
            booking
        });

    } catch (error) {
        console.error('Booking fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch booking',
            error: error.message
        });
    }
});

// Update booking status (payment confirmation)
router.patch('/:bookingId/status', verifyToken, async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { status, paymentStatus } = req.body;

        // Verify booking belongs to user
        const booking = await queryOne(
            'SELECT id FROM bookings WHERE booking_id = ? AND user_id = ?',
            [bookingId, req.user.userId]
        );

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // Update booking
        await query(
            'UPDATE bookings SET status = ?, payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE booking_id = ?',
            [status || 'confirmed', paymentStatus || 'paid', bookingId]
        );

        res.json({
            success: true,
            message: 'Booking updated successfully'
        });

    } catch (error) {
        console.error('Booking update error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update booking',
            error: error.message
        });
    }
});

// Cancel booking
router.delete('/:bookingId', verifyToken, async (req, res) => {
    try {
        const { bookingId } = req.params;

        // Verify booking belongs to user and can be cancelled
        const booking = await queryOne(
            'SELECT id, status, checkin_date FROM bookings WHERE booking_id = ? AND user_id = ?',
            [bookingId, req.user.userId]
        );

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // Check if cancellation is allowed (e.g., at least 24 hours before check-in)
        const checkinDate = new Date(booking.checkin_date);
        const now = new Date();
        const hoursDifference = (checkinDate - now) / (1000 * 60 * 60);

        if (hoursDifference < 24) {
            return res.status(400).json({
                success: false,
                message: 'Cancellation not allowed less than 24 hours before check-in'
            });
        }

        if (booking.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Booking is already cancelled'
            });
        }

        // Update booking status to cancelled
        await query(
            'UPDATE bookings SET status = "cancelled", updated_at = CURRENT_TIMESTAMP WHERE booking_id = ?',
            [bookingId]
        );

        res.json({
            success: true,
            message: 'Booking cancelled successfully'
        });

    } catch (error) {
        console.error('Booking cancellation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel booking',
            error: error.message
        });
    }
});

module.exports = router;