const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const app = express();
// Create MySQL connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'USE_Clothing'
});
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });


app.set('view engine', 'ejs');

app.use(express.static('public'));

app.use(express.urlencoded({
    extended: false
}));

app.get('/', (req, res) => {
    const sql = 'SELECT * FROM shirts WHERE shirtId NOT IN (SELECT shirtId FROM cart) AND status = "available" ';
    connection.query(sql, (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error Retrieving shirts');
        }
        res.render('index', { shirts: results });
    });
});
app.get('/shirt/:id', (req, res) => {
    const shirtId = req.params.id;
    const sql = 'SELECT * FROM shirts WHERE shirtId = ?'
    connection.query(sql, [shirtId], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error Retrieving shirts by ID');
        }
        if (results.length > 0) {
            res.render('shirt', { shirt: results[0] });
        } else {
            res.status(404).send('shirt not found');
        }
    });
});

app.get('/addShirt', (req, res) => {
    res.render('addShirt');
});

app.post('/addShirt', upload.single('image'), (req, res) => {
    const { name, price, size } = req.body;
    let image;
    if (req.file) {
        image = req.file.filename;
    } else {
        image = null;
    }
    const sql = 'INSERT INTO shirts (shirtName,  price, size, image)VALUES (?,?,?,?)';
    connection.query(sql, [name, price, size, image], (error, results) => {
        if (error) {
            console.error("Error adding shirt:", error);
            res.status(500).send('Error adding shirt');
        } else {
            res.redirect('/');
        }
    });
});

app.get('/editShirt/:id', (req, res) => {
    const shirtId = req.params.id;
    const sql = 'SELECT * FROM shirts WHERE shirtId = ?';
    connection.query(sql, [shirtId], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving shirt by ID');
        }
        if (results.length > 0) {
            res.render('editShirt', { shirt: results[0] });
        } else {
            res.status(404).send('shirt not found');
        }
    });
});

app.post('/editShirt/:id', upload.single('image'), (req, res) => {
    const shirtId = req.params.id;
    const { name, price, size } = req.body;
    let image = req.body.currentImage;
    if (req.file) {
        image = req.file.filename;
    }
    const sql = 'UPDATE shirts SET shirtName = ? , price = ?, size = ?, image = ? WHERE shirtId = ?';

    connection.query(sql, [name, price, size, image, shirtId], (error, results) => {
        if (error) {
            console.error("Error updating shirt:", error);
            res.status(500).send('Error updating shirt');
        } else {
            res.redirect('/');
        };
    });
});

app.get('/deleteShirt/:id', (req, res) => {
    const shirtId = req.params.id;
    const sql = 'DELETE FROM shirts WHERE shirtId = ?';
    connection.query(sql, [shirtId], (error, results) => {
        if (error) {
            console.error("Error deleting shirt:", error);
            res.status(500).send('Error deleting shirt');
        } else {
            res.redirect('/');
        }
    });
});



app.get('/addcart/:id', (req, res) => {
    const shirtId = req.params.id;
    const sql = 'INSERT INTO cart (shirtId) SELECT shirtId FROM shirts WHERE shirtId = ?';
    connection.query(sql, [shirtId], (error, results) => {
        if (error) {
            console.error("Error add shirt to cart :", error);
            res.status(500).send('Error add shirt to cart');
        } else {
            res.redirect('/');
        }
    });
});

app.get('/cart', (req, res) => {
    const sql = `
        SELECT shirts.* FROM shirts
        JOIN cart ON shirts.shirtId = cart.shirtId
    `;
    connection.query(sql, (error, results) => {
        if (error) {
            console.error('Database query error:', error);
            return res.status(500).send('Error Retrieving cart');
        }

        let total = 0;
        results.forEach(item => {
            total += item.price;
        });

        res.render('cart', { cartItems: results, total });
    });
});

app.get('/deletecart/:id', (req, res) => {
    const shirtId = req.params.id;
    const sql = 'DELETE FROM cart WHERE shirtId = ?';
    connection.query(sql, [shirtId], (error, results) => {
        if (error) {
            console.error("Error removing from cart:", error);
            res.status(500).send('Error removing from cart');
        } else {
            res.redirect('/cart');
        }
    });
});

app.get('/checkout', (req, res) => {
    const sql = 'DELETE FROM cart ';
    const updsql = "UPDATE shirts SET status = 'bought' WHERE shirtId IN(SELECT shirtId FROM cart)";
    connection.query(updsql, (error, results) => {
        if (error) {
            console.error('Error during checkout:', error);
            return res.status(500).send('Error during checkout');
        }
        connection.query(sql, (error, results) => {
            if (error) {
                console.error('Error during checkout :', error);
                return res.status(500).send('Error during checkout');
            }
            res.redirect('/');
        });
    });
});

app.get('/history', (req, res) => {
    const sql = 'SELECT * FROM shirts WHERE status = "bought" '
    connection.query(sql, (error, results) => {
        if (error) {
            console.error('Error access history :', error);
            return res.status(500).send('Error access history');
        } else {
            res.render('history', { shirts: results });
        }
    });
});

app.get('/void/:id', (req, res) => {
    const shirtId = req.params.id;
    const sql = 'UPDATE shirts SET status = "available" WHERE shirtId = ?';
    connection.query(sql, [shirtId], (error, results) => {
        if (error) {
            console.error('Error to void:', error);
            return res.status(500).send('Error to void');
        } else {
            res.redirect('/history')
        }
    });
});

app.get('/size', (req, res) => {
    res.render('size');
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));