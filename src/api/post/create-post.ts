import express, { Request, Response } from 'express';
import multer from 'multer';  // allows for accessing FormData
import path from 'path';
import pool from '../../db/postgres';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync } from 'fs'; // Importing the file system module
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = path.extname(file.originalname); // Get original extension
      cb(null, file.fieldname + '-' + uniqueSuffix + extension); // Save with extension
    }
  });
const upload = multer({ storage: storage });

const router = express.Router();

router.post('/', upload.array('images', 10), async (req: Request, res: Response) => {
    // It turns out I don't need to check the redis sessionDB, req.session.user is already checking the db for me.
    const sessionId = req.session.user;
    if (!sessionId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    const userId = sessionId.userId;
    const role = sessionId.role;
    const {
        title,
        description,
        price,
        currency,
        quantity,
        sellBuyByDate,
        postStatus,
        totalOrPerItem,
        postType,
        openToNegotiate
    } = req.body;

    const images = req.files as Express.Multer.File[];; // Array of uploaded files
    console.log(images);
    let realPostType;
    let realPostStatus;
    if (postType === 'true') {
        realPostType = 'Sell';
    } else {
        realPostType = "Buy";
    }

    if (postStatus === "Post to market") {
        realPostStatus = "Pending"
    } else {
        realPostStatus = "Draft";
    }

    if (postStatus === "Post to market") { // If it is meant for the market, then there should be no empty values.
        if (price === "" || description === "") {
            res.status(400).json({message: "If you want to post to the market, price and description cannot be empty."});
            return;
        }
    }
    // save the post to the Postgres Database
    try {
        const insert_new_post_query = readFileSync('./src/sql_queries/insert_new_post.sql', 'utf-8');
        const post_id = uuidv4();
        await pool.query(insert_new_post_query, [post_id, userId, realPostType, realPostStatus, title, price, currency, quantity, totalOrPerItem, description, openToNegotiate, sellBuyByDate, 0]);
        
        const insert_new_image_query = readFileSync('./src/sql_queries/insert_new_image.sql', 'utf-8');
        if (images) {
            for (let image of images) {
                await pool.query(insert_new_image_query, [
                    uuidv4(),       // image_id
                    post_id,         // post_id from the new post
                    image.path,      // image_url or path to the uploaded image file
                ]);
            }
        }
        
        res.status(200).json({ message: 'Post successfully created! currently pending for approval from admin.' });
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "An error occured on the database with creating new post." });
        return;
    }

})

export default router;