const express = require('express');
const { query, queryOne } = require('../config/database');

const router = express.Router();

// Get all packages with filtering
router.get('/', async (req, res) => {
    try {
        const { category, search, minPrice, maxPrice, sort } = req.query;

        let sql = `
            SELECT id, title, location, duration, price, rating, category, 
                   description, image_url, includes, activities, created_at
            FROM travel_packages 
            WHERE is_active = TRUE
        `;

        const params = [];

        // Apply filters
        if (category && category !== 'all') {
            sql += ' AND category = ?';
            params.push(category);
        }

        if (search) {
            sql += ' AND (title LIKE ? OR location LIKE ? OR description LIKE ?)';
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam, searchParam);
        }

        if (minPrice) {
            sql += ' AND price >= ?';
            params.push(parseFloat(minPrice));
        }

        if (maxPrice) {
            sql += ' AND price <= ?';
            params.push(parseFloat(maxPrice));
        }

        // Apply sorting
        switch (sort) {
            case 'price_low':
                sql += ' ORDER BY price ASC';
                break;
            case 'price_high':
                sql += ' ORDER BY price DESC';
                break;
            case 'rating':
                sql += ' ORDER BY rating DESC';
                break;
            case 'newest':
                sql += ' ORDER BY created_at DESC';
                break;
            default:
                sql += ' ORDER BY rating DESC, price ASC';
        }

        const packages = await query(sql, params);

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
            packages,
            count: packages.length
        });

    } catch (error) {
        console.error('Packages fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch packages',
            error: error.message
        });
    }
});

// Get single package by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const package = await queryOne(`
            SELECT id, title, location, duration, price, rating, category, 
                   description, image_url, includes, activities, created_at
            FROM travel_packages 
            WHERE id = ? AND is_active = TRUE
        `, [id]);

        if (!package) {
            return res.status(404).json({
                success: false,
                message: 'Package not found'
            });
        }

        // Parse JSON fields
        if (package.includes && typeof package.includes === 'string') {
            package.includes = JSON.parse(package.includes);
        }
        if (package.activities && typeof package.activities === 'string') {
            package.activities = JSON.parse(package.activities);
        }

        res.json({
            success: true,
            package
        });

    } catch (error) {
        console.error('Package fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch package',
            error: error.message
        });
    }
});

// Get package categories
router.get('/meta/categories', async (req, res) => {
    try {
        const categories = await query(`
            SELECT category, COUNT(*) as count 
            FROM travel_packages 
            WHERE is_active = TRUE 
            GROUP BY category 
            ORDER BY count DESC
        `);

        res.json({
            success: true,
            categories
        });

    } catch (error) {
        console.error('Categories fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories',
            error: error.message
        });
    }
});

// Get package statistics
router.get('/meta/stats', async (req, res) => {
    try {
        const stats = await queryOne(`
            SELECT 
                COUNT(*) as total_packages,
                AVG(price) as avg_price,
                MIN(price) as min_price,
                MAX(price) as max_price,
                AVG(rating) as avg_rating
            FROM travel_packages 
            WHERE is_active = TRUE
        `);

        res.json({
            success: true,
            stats
        });

    } catch (error) {
        console.error('Stats fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch stats',
            error: error.message
        });
    }
});

module.exports = router;