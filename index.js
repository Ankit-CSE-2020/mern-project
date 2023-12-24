require('dotenv').config()
const express=require('express');
const server=express();
const mongoose = require('mongoose');
const cors=require('cors')
const session = require('express-session');
const passport = require('passport');
const LocalStrategy=require('passport-local').Strategy
const crypto=require('crypto')
const JwtStrategy = require('passport-jwt').Strategy; 
const ExtractJwt = require('passport-jwt').ExtractJwt;
const jwt = require('jsonwebtoken');
const cookieParser=require('cookie-parser')
const path=require('path')

const productsRouter= require('./routes/Product')
const categoriesRouter= require('./routes/Categories')
const brandsRouter= require('./routes/Brands')
const userRouter =require('./routes/User')
const authRouter=require('./routes/Auth')
const cartRouter=require('./routes/Cart')
const orderRouter=require('./routes/Order');
const { User } = require('./model/User');
const { isAuth, sanitizerUser, cookieExtractor } = require('./Services/common');
const { Order } = require('./model/Order');

 
// Webhook

// TODO: we will capture actual order after deploying out server live on public URL

const endpointSecret = process.env.ENDPOINT_SECRET;

server.post('/webhook', express.raw({type: 'application/json'}), async(request, response) => {
  const sig = request.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
  } catch (err) {
    response.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntentSucceeded = event.data.object;
      console.log({paymentIntentSucceeded})
      const order= await Order.findById(paymentIntentSucceeded.metadata.orderId)
      order.paymentStatus='received';
      order.save();
      // Then define and call a function to handle the event payment_intent.succeeded
      break;
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  response.send();
});



//JWT option
var opts = {}
//opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.jwtFromRequest= cookieExtractor;
opts.secretOrKey = process.env.JWT_SECRET_KEY;



//middleware
server.use(express.static(path.resolve(__dirname,'build')))
server.use(cookieParser())

server.use(session({
     secret:process.env.SESSION_KEY,
     resave:false,
     saveUninitialized:false,
     
}))

//server.use(express.raw({type: 'application/json'}));
server.use(passport.authenticate('session'))
server.use(cors({
       exposedHeaders:['X-Total-Count']
}))

server.use(express.json()) //to accept/parse req.body
server.use('/products',isAuth(),productsRouter.router)   //we can also use JWT token for client-only auth
server.use('/categories',isAuth(),categoriesRouter.router)
server.use('/brands',isAuth(),brandsRouter.router)
server.use('/users',isAuth(),userRouter.router)
server.use('/auth',authRouter.router)
server.use('/cart',isAuth(),cartRouter.router)
server.use('/orders',isAuth(),orderRouter.router)
//this line we add to make router work in case of other router doesnot math
server.get('*',(req,res) => res.sendFile(path.resolve("build","index.html")))


//Passport Strategies 
passport.use('local',new LocalStrategy(
  {usernameField:'email'},
  async function(email, password, done) {  //by deafult passport uses username
    try{
      let user=await User.findOne({email:email}).exec();
     //console.log(email,password,user);
      if(!user){
        done(null,false,{message:"no such user email"})
      }

      crypto.pbkdf2(
        password,
        user.salt, 
        310000, 
        32, 
        'sha256',
        async function(err, hashedPassword) { 

          if(!crypto.timingSafeEqual(user.password,hashedPassword)){
            done(null,false,{message:"inavalid credentials"})
          }
             const token = jwt.sign(sanitizerUser(user), process.env.JWT_SECRET_KEY);
            done(null,{id:user.id, role:user.role ,token})    //this line send data to serilizer
      

        })
     
      }catch(err){
          done(err)
      }
  }
));

passport.use('jwt',new JwtStrategy(opts,async function(jwt_payload, done) {
 
     try{

       const user=await User.findById(jwt_payload.id)
      // console.log('--',user);
           if (user) {
               return done(null, sanitizerUser(user));     //this call serilizer
           } else {
               return done(null, false);
           }
     }catch(err){
            return done(err, false);
     }
}));




//this create session variable req.user on being called from callbacks
passport.serializeUser(function(user, cb) {
 // console.log("serilize",user);
  process.nextTick(function() {
    return cb(null, {
      id: user.id,
      role:user.role 
    });
  });
});

//this changes session variable req.user when called from authorized request
passport.deserializeUser(function(user, cb) {
 // console.log("de-serilize",user);
  process.nextTick(function() {
    return cb(null, user);
  });
});


//payment
// This is your test secret API key.
  const stripe = require("stripe")(process.env.STRIPE_SERVER_KEY);

// server.use(express.static("public"));
// server.use(express.json());



server.post("/create-payment-intent", async (req, res) => {
  const { totalAmount ,orderId} = req.body;

  // Create a PaymentIntent with the order amount and currency
  const paymentIntent = await stripe.paymentIntents.create({
    amount: totalAmount*100,
    currency: "inr",
    // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
    automatic_payment_methods: {
      enabled: true,
    },
    metadata:{
      orderId 
    }
  });

  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});



main().catch(err => console.log(err));

async function main() {
  await mongoose.connect(process.env.MONGODB_URL);
  console.log("Database connected");
}

// server.get('/',(req,res)=>{
//     res.send("hlo")
// })




server.listen(process.env.PORT,()=>{
    console.log("Server start at port 8080");
})