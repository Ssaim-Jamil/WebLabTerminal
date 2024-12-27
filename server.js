// Required modules
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const { check, validationResult } = require('express-validator');

// Models
const Attraction = require('./models/Attraction');
const Review = require('./models/Review');
const Visitor = require('./models/Visitor');

// Initialize app
const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'secret_key',
    resave: false,
    saveUninitialized: false
}));
app.set('view engine', 'ejs');

// Database connection
mongoose.connect('mongodb://localhost:27017/attractions_db', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('Database connected!')).catch(err => console.error(err));

// Middleware to check if user is logged in
function isLoggedIn(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Routes
// Home Route
app.get('/', (req, res) => {
    res.render('home', { user: req.session.user });
});

// Signup Route
app.post('/signup', [
  check('name').notEmpty().withMessage('Name is required'),
  check('email').isEmail().withMessage('Enter a valid email'),
  check('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], async (req, res) => {
  console.log(req.body); // Debug statement to log incoming data

  const { name, email, password } = req.body;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
      return res.render('signup', { error: errors.array().map(err => err.msg).join(', ') });
  }

  try {
      const existingUser = await Visitor.findOne({ email });
      if (existingUser) {
          return res.render('signup', { error: 'User already exists!' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newVisitor = new Visitor({ name, email, password: hashedPassword });
      await newVisitor.save();

      res.redirect('/login');
  } catch (err) {
      res.status(500).send('Error signing up');
  }
});


// Login Route
app.get('/login', (req, res) => {
    res.render('login', { error: null }); // Pass null error initially
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await Visitor.findOne({ email });
        if (!user) {
            return res.render('login', { error: 'Invalid email or password' }); // Show error on login page
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.render('login', { error: 'Invalid email or password' });
        }

        req.session.user = user; // Save user to session
        res.redirect('/attractions'); // Redirect to attractions page after login
    } catch (err) {
        res.status(500).send('Error logging in');
    }
});

// Logout Route
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Attractions CRUD Operations
app.get('/attractions', isLoggedIn, async (req, res) => {
    const attractions = await Attraction.find();
    res.render('attractions', { attractions });
});

app.post('/attractions', isLoggedIn, async (req, res) => {
    const { name, location, entryFee, rating } = req.body;
    try {
        const newAttraction = new Attraction({ name, location, entryFee, rating });
        await newAttraction.save();
        res.redirect('/attractions');
    } catch (err) {
        res.status(500).send('Error adding attraction');
    }
});

app.get('/attractions/:id/edit', isLoggedIn, async (req, res) => {
    const attraction = await Attraction.findById(req.params.id);
    if (!attraction) {
        return res.status(404).send('Attraction not found');
    }
    res.render('editAttraction', { attraction });
});

app.post('/attractions/:id/update', isLoggedIn, async (req, res) => {
    const { name, location, entryFee, rating } = req.body;
    try {
        await Attraction.findByIdAndUpdate(req.params.id, { name, location, entryFee, rating });
        res.redirect('/attractions');
    } catch (err) {
        res.status(500).send('Error updating attraction');
    }
});

app.post('/attractions/:id/delete', isLoggedIn, async (req, res) => {
    try {
        await Attraction.findByIdAndDelete(req.params.id);
        res.redirect('/attractions');
    } catch (err) {
        res.status(500).send('Error deleting attraction');
    }
});

// Reviews CRUD Operations
app.get('/reviews', isLoggedIn, async (req, res) => {
    const reviews = await Review.find().populate('attraction visitor');
    res.render('reviews', { reviews });
});

app.post('/reviews', isLoggedIn, async (req, res) => {
    const { attractionId, score, comment } = req.body;
    const userId = req.session.user._id;

    try {
        // Check if the user has visited the attraction
        const user = await Visitor.findById(userId).populate('visitedAttractions');
        const hasVisited = user.visitedAttractions.some(attraction => attraction.equals(attractionId));

        if (!hasVisited) {
            return res.send('You cannot review an attraction you have not visited.');
        }

        // Check if the user has already reviewed this attraction
        const existingReview = await Review.findOne({ attraction: attractionId, visitor: userId });
        if (existingReview) {
            return res.send('You cannot review the same attraction more than once.');
        }

        // Add new review
        const newReview = new Review({
            attraction: attractionId,
            visitor: userId,
            score,
            comment
        });
        await newReview.save();
        res.redirect('/reviews');
    } catch (err) {
        res.status(500).send('Error adding review');
    }
});

app.get('/reviews/:id/edit', isLoggedIn, async (req, res) => {
    const review = await Review.findById(req.params.id).populate('attraction');
    if (!review) {
        return res.status(404).send('Review not found');
    }
    res.render('editReview', { review });
});

app.post('/reviews/:id/update', isLoggedIn, async (req, res) => {
    const { score, comment } = req.body;
    try {
        await Review.findByIdAndUpdate(req.params.id, { score, comment });
        res.redirect('/reviews');
    } catch (err) {
        res.status(500).send('Error updating review');
    }
});

app.post('/reviews/:id/delete', isLoggedIn, async (req, res) => {
    try {
        await Review.findByIdAndDelete(req.params.id);
        res.redirect('/reviews');
    } catch (err) {
        res.status(500).send('Error deleting review');
    }
});

// Visitors: Add Visited Attractions
app.post('/visitors/:id/visit', isLoggedIn, async (req, res) => {
    const visitorId = req.params.id;
    const { attractionId } = req.body;
    try {
        const visitor = await Visitor.findById(visitorId);
        if (!visitor) {
            return res.status(404).send('Visitor not found');
        }

        if (!visitor.visitedAttractions.includes(attractionId)) {
            visitor.visitedAttractions.push(attractionId);
            await visitor.save();
        }

        res.redirect('/attractions');
    } catch (err) {
        res.status(500).send('Error marking attraction as visited');
    }
});

// New Endpoints
// 1. Top-rated Attractions
app.get('/attractions/top-rated', isLoggedIn, async (req, res) => {
    try {
        const attractions = await Attraction.find().sort({ rating: -1 }).limit(5);
        res.render('topRated', { attractions });
    } catch (err) {
        res.status(500).send('Error fetching top-rated attractions');
    }
});

// 2. Visitor Activity
app.get('/visitors/activity', isLoggedIn, async (req, res) => {
    try {
        const activity = await Visitor.aggregate([
            {
                $lookup: {
                    from: 'reviews',
                    localField: '_id',
                    foreignField: 'visitor',
                    as: 'reviews'
                }
            },
            {
                $project: {
                    name: 1,
                    email: 1,
                    reviewCount: { $size: '$reviews' }
                }
            }
        ]);
        res.render('visitorActivity', { data: activity });
    } catch (err) {
        res.status(500).send('Error fetching visitor activity');
    }
});

// Server Setup
app.listen(5000, () => {
    console.log('Server running on http://localhost:5000');
});
