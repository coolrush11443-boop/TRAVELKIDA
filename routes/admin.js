const express = require('express');
const jwt = require('jsonwebtoken');
const { query, queryOne } = require('../config/database');

const router = express.Router();

// Admin authentication middleware
const verifyAdmin = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access denied. No token provided.'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
};

// Get admin dashboard statistics
router.get('/dashboard/stats', verifyAdmin, async (req, res) => {
    try {
        // Get overall statistics
        const totalUsers = await queryOne(
            'SELECT COUNT(*) as count FROM users WHERE role = "user"'
        );

        const totalPackages = await queryOne(
            'SELECT COUNT(*) as count FROM travel_packages WHERE is_active = TRUE'
        );

        const totalBookings = await queryOne(
            'SELECT COUNT(*) as count FROM bookings'
        );

        const totalRevenue = await queryOne(
            'SELECT SUM(total_price) as total FROM bookings WHERE payment_status = "paid"'
        );

        const pendingBookings = await queryOne(
            'SELECT COUNT(*) as count FROM bookings WHERE status = "pending"'
        );

        const confirmedBookings = await queryOne(
            'SELECT COUNT(*) as count FROM bookings WHERE status = "confirmed"'
        );

        // Get monthly revenue for chart
        const monthlyRevenue = await query(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                SUM(total_price) as revenue,
                COUNT(*) as bookings
            FROM bookings 
            WHERE payment_status = 'paid' 
                AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY month
        `);

        // Get top packages
        const topPackages = await query(`
            SELECT 
                p.title,
                p.location,
                COUNT(b.id) as bookings,
                SUM(b.total_price) as revenue
            FROM travel_packages p
            LEFT JOIN bookings b ON p.id = b.package_id
            WHERE p.is_active = TRUE
            GROUP BY p.id, p.title, p.location
            ORDER BY bookings DESC, revenue DESC
            LIMIT 5
        `);

        res.json({
            success: true,
            stats: {
                totalUsers: totalUsers.count,
                totalPackages: totalPackages.count,
                totalBookings: totalBookings.count,
                totalRevenue: totalRevenue.total || 0,
                pendingBookings: pendingBookings.count,
                confirmedBookings: confirmedBookings.count,
                monthlyRevenue,
                topPackages
            }
        });

    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch admin statistics',
            error: error.message
        });
    }
});

// Get all bookings for admin
router.get('/bookings', verifyAdmin, async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let sql = `
            SELECT 
                b.id, b.booking_id, b.checkin_date, b.checkout_date, b.adults, b.children,
                b.total_price, b.status, b.payment_status, b.created_at,
                u.name as user_name, u.email as user_email, u.phone as user_phone,
                p.title as package_title, p.location as package_location
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN travel_packages p ON b.package_id = p.id
        `;

        const params = [];

        if (status && status !== 'all') {
            sql += ' WHERE b.status = ?';
            params.push(status);
        }

        sql += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const bookings = await query(sql, params);

        // Get total count for pagination
        let countSql = 'SELECT COUNT(*) as total FROM bookings b';
        let countParams = [];

        if (status && status !== 'all') {
            countSql += ' WHERE b.status = ?';
            countParams.push(status);
        }

        const totalResult = await queryOne(countSql, countParams);

        res.json({
            success: true,
            bookings,
            pagination: {
                total: totalResult.total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(totalResult.total / limit)
            }
        });

    } catch (error) {
        console.error('Admin bookings fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch bookings',
            error: error.message
        });
    }
});

// Update booking status (admin)
router.patch('/bookings/:id/status', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, paymentStatus } = req.body;

        const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
        const validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'];

        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        if (paymentStatus && !validPaymentStatuses.includes(paymentStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment status'
            });
        }

        let updateFields = [];
        let params = [];

        if (status) {
            updateFields.push('status = ?');
            params.push(status);
        }

        if (paymentStatus) {
            updateFields.push('payment_status = ?');
            params.push(paymentStatus);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields to update'
            });
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        params.push(id);

        await query(
            `UPDATE bookings SET ${updateFields.join(', ')} WHERE id = ?`,
            params
        );

        res.json({
            success: true,
            message: 'Booking updated successfully'
        });

    } catch (error) {
        console.error('Admin booking update error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update booking',
            error: error.message
        });
    }
});

// Get all users for admin
router.get('/users', verifyAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const users = await query(`
            SELECT 
                u.id, u.name, u.email, u.phone, u.role, u.created_at,
                COUNT(b.id) as total_bookings,
                SUM(CASE WHEN b.payment_status = 'paid' THEN b.total_price ELSE 0 END) as total_spent
            FROM users u
            LEFT JOIN bookings b ON u.id = b.user_id
            WHERE u.role = 'user'
            GROUP BY u.id, u.name, u.email, u.phone, u.role, u.created_at
            ORDER BY u.created_at DESC
            LIMIT ? OFFSET ?
        `, [parseInt(limit), offset]);

        const totalResult = await queryOne(
            'SELECT COUNT(*) as total FROM users WHERE role = "user"'
        );

        res.json({
            success: true,
            users,
            pagination: {
                total: totalResult.total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(totalResult.total / limit)
            }
        });

    } catch (error) {
        console.error('Admin users fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users',
            error: error.message
        });
    }
});

// Get all packages for admin
router.get('/packages', verifyAdmin, async (req, res) => {
    try {
        const packages = await query(`
            SELECT 
                p.*,
                COUNT(b.id) as total_bookings,
                SUM(CASE WHEN b.payment_status = 'paid' THEN b.total_price ELSE 0 END) as total_revenue
            FROM travel_packages p
            LEFT JOIN bookings b ON p.id = b.package_id
            GROUP BY p.id
            ORDER BY p.created_at DESC
        `);

        // Parse JSON fields
        packages.forEach(pkg => {
            if (pkg.includes && typeof pkg.includes === 'string') {
                pkg.includes = JSON.parse(pkg.includes);
            }
            if (pkg.activities && typeof pkg.activities === 'string') {
                pkg.activities = JSON.parse(pkg.activities);
            }
        });

        res.json({
            success: true,
            packages
        });

    } catch (error) {
        console.error('Admin packages fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch packages',
            error: error.message
        });
    }
});

module.exports = router;