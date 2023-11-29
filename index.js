const express = require('express');
const cors = require('cors')
const app =express();
const jwt = require('jsonwebtoken')
const port = process.env.PORT || 5000
require('dotenv').config()
const stripe =require('stripe')(process.env.STRIPE_SECRET_KEY)
//middleware
app.use(cors())
app.use(express.json())

app.get('/',(req,res)=>{
  res.send('Opinion Overflow server is running')
})

app.listen(port,()=>{
  console.log(`server is running on PORT: ${port}`);
})

console.log(process.env.DB_USER);
console.log(process.env.DB_PASS);

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fpdogwm.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    //database collection
    const userCollection = client.db("opinionOverflowDB").collection("users")
    const postCollection = client.db("opinionOverflowDB").collection("posts")
    const commentCollection = client.db("opinionOverflowDB").collection("comments")
    const reportCollection = client.db("opinionOverflowDB").collection("reports")    
    const paymentCollection = client.db("opinionOverflowDB").collection("payments")    
    const announcementCollection = client.db("opinionOverflowDB").collection("announcements")    
    const tagCollection = client.db("opinionOverflowDB").collection("tags")    

   

    //jwt related api
    app.post('/jwt',async(req,res)=>{
      const user = req.body;
      const token = jwt.sign(user,process.env.ACCESS_SECRET_TOKEN,{
        expiresIn:'24h'
      })
      res.send({token})
    })
  

    //middlwares
    const verifyToken=(req,res,next)=>{
      console.log('inside verify token',req.headers.authorization);
      if(!req.headers.authorization){
        return res.status(401).send({message: 'forbidden access'})
      }
      const token =req.headers.authorization.split(' ')[1]
      jwt.verify(token,process.env.ACCESS_SECRET_TOKEN,(err,decoded)=>{
        if(err){
          return res.status(401).send({message: 'forbidden access'})
        }
        req.decoded =decoded;
        next()
      })
    }
  //verfyadmin
    


    //users related api
    app.get('/users',verifyToken,async(req,res)=>{

      const result =await userCollection.find().toArray()
      res.send(result)
    })
   
    app.post('/users',async(req,res)=>{
      const user = req.body

      //insert email if user doesnot exists
    

      const query ={email: user.email}
      const existingUser = await userCollection.findOne(query)
      if(existingUser){
        return res.send({message: 'user already exist',insertedId:null})
      }

      const result =await userCollection.insertOne(user)
      res.send(result)
     })
     
     //admin made api
     app.patch('/users/admin/:id',async(req,res)=>{
      const id = req.params.id
      const filter= {_id: new ObjectId(id)}
   const updatedDoc ={
    $set:{
      role: 'admin'
    }
   }
   const result = await userCollection.updateOne(filter,updatedDoc)
   res.send(result)
    })



     //admin related api
     app.get('/users/admin/:email',verifyToken,async(req,res)=>{
      const email = req.params.email
      if(email!==req.decoded.email){
        return res.status(403).send({message: 'unauthorized access'})
      }
      const query = {email:email}
      const user = await userCollection.findOne(query)
      let admin=false
      if(user){
        admin=user?.role==='admin'
      }
      res.send({admin})
  })



   //email specific data

   app.get('/users/single', async (req, res) => {
    try {
      const email = req.query.email;
      const query = { email: email };
      const result = await userCollection.find(query).toArray();
      console.log(result);
      res.send(result);
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  });

  //email specific post
  app.get('/posts/single', async (req, res) => {
  try {
    const email = req.query.email;
    const query = { email: email };

    // Sort by createdAt in descending order and limit to 3 results
    const result = await postCollection.find(query)
      .sort({ createdAt: -1 })
      .limit(3)
      .toArray();

    console.log(result);
    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
  
  
  //email specific all my post
  app.get('/posts/my', async (req, res) => {
    try {
      const email = req.query.email;
      const query = { email: email };
      const result = await postCollection.find(query).toArray();
      console.log(result);
      res.send(result);
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  });

//delete specific data

  app.delete('/posts/:id',async(req,res)=>{
    const id = req.params.id
    const query= {_id: new ObjectId(id)}
    const result = await postCollection.deleteOne(query)
    res.send(result)
  })



   //posts by users
    app.post('/posts',async(req,res)=>{
      const post =req.body
      const result = await postCollection.insertOne(post)
      res.send(result)
    })

    // app.get('/posts',async(req,res)=>{
    //   const result =await postCollection.find().toArray()
    //   res.send(result)
    // })
    // app.get('/posts', async (req, res) => {
    //   try {
    //     const result = await postCollection.find().sort({ createdAt: -1 }).toArray();
    //     console.log(result); // Log the result to the console
    //     res.send(result);
    //   } catch (error) {
    //     console.error(error);
    //     res.status(500).send('Internal Server Error');
    //   }
    // });


     //get result on popularity
    //  app.get('/posts', async (req, res) => {
    //   try {
    //     let result;
    
    //     // Check if a query parameter named 'sortByPopularity' is present
    //     const sortByPopularity = req.query.sortByPopularity === 'true';
    
    //     if (sortByPopularity) {
    //       // If 'sortByPopularity' is true, sort by popularity
    //       result = await postCollection
    //         .aggregate([
    //           {
    //             $addFields: {
    //               voteDifference: { $subtract: ['$upVote', '$downVote'] },
    //             },
    //           },
    //           {
    //             $sort: { voteDifference: -1 },
    //           },
    //         ])
    //         .toArray();
    //     } else {
    //       // Otherwise, fetch posts in descending order of creation date
    //       result = await postCollection.find().sort({ createdAt: -1 }).toArray();
    //     }
    
    //     console.log(result); // Log the result to the console
    //     res.send(result);
    //   } catch (error) {
    //     console.error(error);
    //     res.status(500).json({ error: 'Internal Server Error' });
    //   }
    // });


   // Add pagination parameters to the /posts endpoint
  //  app.get('/posts', async (req, res) => {
  //   try {
  //     let result;
  
  //     // Check if a query parameter named 'sortByPopularity' is present
  //     const sortByPopularity = req.query.sortByPopularity === 'true';
  
  //     if (sortByPopularity) {
  //       // If 'sortByPopularity' is true, sort by popularity
  //       result = await postCollection
  //         .aggregate([
  //           {
  //             $addFields: {
  //               voteDifference: { $subtract: ['$upVote', '$downVote'] },
  //             },
  //           },
  //           {
  //             $sort: { voteDifference: -1 },
  //           },
  //         ])
  //         .toArray();
  //     } else {
  //       // Otherwise, fetch posts in descending order of creation date
  //       result = await postCollection.find().sort({ createdAt: -1 }).toArray();
  //     }
  
  //     console.log(result); // Log the result to the console
  //     res.send(result);
  //   } catch (error) {
  //     console.error(error);
  //     res.status(500).json({ error: 'Internal Server Error' });
  //   }
  // });


  app.get('/posts', async (req, res) => {
    try {
      let result;
  
      const page = parseInt(req.query.page) || 1;
      const pageSize = 5; // Set the page size to 5
  
      const sortByPopularity = req.query.sortByPopularity === 'true';
      const sortOptions = sortByPopularity
        ? [{ $addFields: { voteDifference: { $subtract: ['$upVote', '$downVote'] } } }, { $sort: { voteDifference: -1 } }]
        : [{ $sort: { createdAt: -1 } }];
  
      const skip = (page - 1) * pageSize;
  
      result = await postCollection.aggregate([...sortOptions, { $skip: skip }, { $limit: pageSize }]).toArray();
  
      console.log(result);
      res.send(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
 


   









   //comment related API
   app.post('/comments',async(req,res)=>{
    const comment =req.body
    const result = await commentCollection.insertOne(comment)
    res.send(result)
  })

  //comment load using specific postid

  app.get('/comments/single', async (req, res) => {
    try {
      const postId = req.query.postId; // Corrected to match the client-side code
      const query = { postId: postId };
      const result = await commentCollection.find(query).toArray();
      console.log(result);
      res.send(result);
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  });






   //update data using patch
   app.patch('/posts/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $inc: {
          commentCount: 1, // Increment the 'count' field by 1
        },
      };
  
      const result = await postCollection.updateOne(filter, updateDoc);
      res.send(result);
    } catch (error) {
      console.error('Error updating count:', error);
      res.status(500).send('Internal Server Error');
    }
  });

  //update data using patch of upvote
  app.patch('/posts/count/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $inc: {
          upVote: 1, // Increment the 'count' field by 1
          voteCount:1
        },
      };
  
      const result = await postCollection.updateOne(filter, updateDoc);
      res.send(result);
    } catch (error) {
      console.error('Error updating count:', error);
      res.status(500).send('Internal Server Error');
    }
  });
  //update data using patch of downvote
  app.patch('/posts/down/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $inc: {
          downVote: 1, // Increment the 'count' field by 1
          voteCount:1
        },
      };
  
      const result = await postCollection.updateOne(filter, updateDoc);
      res.send(result);
    } catch (error) {
      console.error('Error updating count:', error);
      res.status(500).send('Internal Server Error');
    }
  });



    //post report comment api
   app.post('/reports',async(req,res)=>{
    const report =req.body
    const result = await reportCollection.insertOne(report)
    res.send(result)
  })
  app.get('/reports',verifyToken,async(req,res)=>{
    const result =await reportCollection.find().toArray()
    res.send(result)
  })



 


   //payment related api
   app.post('/create-payment-intent',async(req,res)=>{
    const {price} =req.body
    const amount = parseInt(price*100)
    console.log(amount);
    const paymentIntent = await stripe.paymentIntents.create({

      amount:amount,
      currency:'usd',
      payment_method_types: ['card'],
    })

   res.send({
    clientSecret: paymentIntent.client_secret
   })

   })

   app.post('/payments',async(req,res)=>{
    const payment =req.body
    const result = await paymentCollection.insertOne(payment)
    res.send(result)
  })

  
  app.patch('/users/email/:email', async (req, res) => {
    try {
      const email = req.params.email;
  
      
      const filter = { email: email };
  
     
      const updateDoc = {
        $set: {
          badge: 'gold',
        },
      };
  
      
      const result = await userCollection.updateOne(filter, updateDoc);
  
      res.send(result);
    } catch (error) {
      console.error('Error updating badge:', error);
      res.status(500).send('Internal Server Error');
    }
  });

   //email specific user info
   app.get('/users/info', async (req, res) => {
    try {
      const email = req.query.email;
      const query = { email: email };
      const result = await userCollection.find(query).toArray();
      console.log(result);
      res.send(result);
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  });


    //announcement post api
    app.post('/announcements',async(req,res)=>{
      const announcement =req.body
      const result = await announcementCollection.insertOne(announcement)
      res.send(result)
    })

    app.get('/announcements',verifyToken,async(req,res)=>{
      const result =await announcementCollection.find().toArray()
      res.send(result)
    })

    //tag post api
    app.post('/tags',async(req,res)=>{
      const tag =req.body
      const result = await tagCollection.insertOne(tag)
      res.send(result)
    })
    app.get('/tags',verifyToken,async(req,res)=>{
      const result =await tagCollection.find().toArray()
      res.send(result)
    })

    //id wise comment
    app.get('/comments/post',verifyToken, async (req, res) => {
      try {
        const postId = req.query.postId; // Corrected to match the client-side code
        const query = { postId: postId };
        const result = await commentCollection.find(query).toArray();
        console.log(result);
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
      }
    });

    //admin stats api
    app.get('/admin-stats',verifyToken,async(req,res)=>{
      const users =await userCollection.estimatedDocumentCount()
      const posts=await postCollection.estimatedDocumentCount()
      const comments =await commentCollection.estimatedDocumentCount()
      const membership =await paymentCollection.estimatedDocumentCount()

        // const payments = await paymentCollection.find().toArray()
        // const revenue = payments.reduce((total,payment)=>total+payment.price,0)


          const result =await paymentCollection.aggregate([
            {
              $group:{
                _id:null,
                totalRevenue:{
                  $sum:'$price'
                }
              }
            }
          ]).toArray()
          const revenue = result.length>0?result[0].totalRevenue:0

      res.send({ 
        users,
        posts,
        comments,
        membership,
        revenue
      })
    })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

