import express, { Request, Response } from "express";
import cors from "cors";
import "dotenv/config";
import mongoose from "mongoose";
import userRoutes from "./routes/users";
import authRoutes from "./routes/auth";
import cookieParser from "cookie-parser";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import myHotelRoutes from "./routes/my-rooms";
import hotelRoutes from "./routes/rooms";
import bookingRoutes from "./routes/my-bookings";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

mongoose.connect(process.env.MONGODB_CONNECTION_STRING as string);

const app = express(); //create new express app
app.use(cookieParser());
app.use(express.json()); //convert the body of API requests into Json automatically
app.use(express.urlencoded({ extended: true })); //parse the URL to get to create the parameters
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);
//prevent certain requests from certain URLS if it doesnt agree with them
// our frontend and backend will be on different port -> block. this helps to configure and stop the block

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/my-rooms", myHotelRoutes);
app.use("/api/hotels", hotelRoutes);
app.use("/api/my-bookings", bookingRoutes);

app.listen(7001, () => {
  console.log("server running on localhost:7001");
});
