import express, { Request, Response } from "express";
import Hotel from "../models/room";
import { BookingType, HotelSearchResponse } from "../shared/types";
import { param, validationResult } from "express-validator";
import Stripe from "stripe";
import verifyToken from "../middleware/auth";

const stripe = new Stripe(process.env.STRIPE_API_KEY as string);

const router = express.Router();

router.get("/search", async (req: Request, res: Response) => {
  try {
    const query = constructSearchQuery(req.query);

    let sortOptions = {};
    switch (req.query.sortOption) {
      case "starRating":
        sortOptions = { starRating: -1 };
        break;
      case "pricePerNightAsc":
        sortOptions = { pricePerNight: 1 };
        break;
      case "pricePerNightDesc":
        sortOptions = { pricePerNight: -1 };
        break;
    }

    const pageSize = 5;
    const pageNumber = parseInt(
      req.query.page ? req.query.page.toString() : "1"
    );
    const skip = (pageNumber - 1) * pageSize;

    const hotels = await Hotel.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(pageSize);

    const total = await Hotel.countDocuments(query);

    const response: HotelSearchResponse = {
      data: hotels,
      pagination: {
        total,
        page: pageNumber,
        pages: Math.ceil(total / pageSize),
      },
    };

    res.json(response);
  } catch (error) {
    console.log("error", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.get("/", async (req: Request, res: Response) => {
  try {
    const hotels = await Hotel.find().sort("-lastUpdated");
    res.json(hotels);
  } catch (error) {
    console.log("error", error);
    res.status(500).json({ message: "Error fetching hotels" });
  }
});

router.get(
  "/:id",
  [param("id").notEmpty().withMessage("Hotel ID is required")],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const id = req.params.id.toString();

    try {
      const hotel = await Hotel.findById(id);
      res.json(hotel);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Error fetching hotel" });
    }
  }
);

router.post(
  "/:hotelId/bookings/payment-intent",
  verifyToken,
  async (req: Request, res: Response) => {
    const { numberOfNights } = req.body;
    const hotelId = req.params.hotelId;

    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return res.status(400).json({ message: "Hotel not found" });
    }

    const totalCost = hotel.pricePerNight * numberOfNights;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCost * 100,
      currency: "gbp",
      metadata: {
        hotelId,
        userId: req.userId,
      },
    });

    if (!paymentIntent.client_secret) {
      return res.status(500).json({ message: "Error creating payment intent" });
    }

    const response = {
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret.toString(),
      totalCost,
    };

    res.send(response);
  }
);

router.post(
  "/:hotelId/bookings",
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      const paymentIntentId = req.body.paymentIntentId;

      const paymentIntent = await stripe.paymentIntents.retrieve(
        paymentIntentId as string
      );

      if (!paymentIntent) {
        return res.status(400).json({ message: "payment intent not found" });
      }

      if (
        paymentIntent.metadata.hotelId !== req.params.hotelId ||
        paymentIntent.metadata.userId !== req.userId
      ) {
        return res.status(400).json({ message: "payment intent mismatch" });
      }

      if (paymentIntent.status !== "succeeded") {
        return res.status(400).json({
          message: `payment intent not succeeded. Status: ${paymentIntent.status}`,
        });
      }

      const newBooking: BookingType = {
        ...req.body,
        userId: req.userId,
      };

      const hotel = await Hotel.findOneAndUpdate(
        { _id: req.params.hotelId },
        {
          $push: { bookings: newBooking },
        }
      );

      if (!hotel) {
        return res.status(400).json({ message: "hotel not found" });
      }

      await hotel.save();
      res.status(200).send();
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "something went wrong" });
    }
  }
);

const constructSearchQuery = (queryParams: any) => {
  let constructedQuery: any = {};

  if (queryParams.destination) {
    const destinationWords = queryParams.destination
      .normalize("NFD") // normalize the string
      .replace(/[\u0300-\u036f]/g, "") // remove diacritics
      .replace(/\s/g, "") // remove spaces
      .split(",")
      .map((word: string) => word.trim().toLowerCase()); // convert to lowercase
    constructedQuery.$or = [
      {
        city: {
          $in: destinationWords.map((word: string) => new RegExp(word, "i")),
        },
      },
      {
        country: {
          $in: destinationWords.map((word: string) => new RegExp(word, "i")),
        },
      },
    ];
  }

  if (queryParams.adultCount) {
    constructedQuery.adultCount = {
      $gte: parseInt(queryParams.adultCount),
    };
  }

  if (queryParams.childCount) {
    constructedQuery.childCount = {
      $gte: parseInt(queryParams.childCount),
    };
  }

  if (queryParams.facilities) {
    constructedQuery.facilities = {
      $all: Array.isArray(queryParams.facilities)
        ? queryParams.facilities
        : [queryParams.facilities],
    };
  }

  if (queryParams.types) {
    constructedQuery.type = {
      $in: Array.isArray(queryParams.types)
        ? queryParams.types
        : [queryParams.types],
    };
  }

  if (queryParams.stars) {
    const starRatings = Array.isArray(queryParams.stars)
      ? queryParams.stars.map((star: string) => parseInt(star))
      : parseInt(queryParams.stars);

    constructedQuery.starRating = { $in: starRatings };
  }

  if (queryParams.maxPrice) {
    constructedQuery.pricePerNight = {
      $lte: parseInt(queryParams.maxPrice).toString(),
    };
  }

  return constructedQuery;
};

// Get bookings information for a hotel
router.get(
  "/:hotelId/bookings",
  verifyToken,
  async (req: Request, res: Response) => {
    const hotelId = req.params.hotelId;

    try {
      const hotel = await Hotel.findById(hotelId);
      if (!hotel) {
        return res.status(404).json({ message: "Hotel not found" });
      }

      res.json(hotel.bookings);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Error fetching bookings" });
    }
  }
);

router.get("/:hotelId/availability", async (req: Request, res: Response) => {
  const { checkIn, checkOut } = req.query;
  const hotelId = req.params.hotelId;

  try {
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return res.status(404).json({ message: "Hotel not found" });
    }

    const isAvailable = hotel.bookings.every((booking) => {
      // Convert dates to JavaScript Date objects for comparison
      const bookingCheckIn = new Date(booking.checkIn);
      const bookingCheckOut = new Date(booking.checkOut);
      const requestedCheckIn = new Date(checkIn as string);
      const requestedCheckOut = new Date(checkOut as string);

      // Check if the requested date range overlaps with the booking
      return (
        requestedCheckOut <= bookingCheckIn ||
        requestedCheckIn >= bookingCheckOut
      );
    });

    res.json({ isAvailable });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error checking availability" });
  }
});

// router.get("/:hotelId/availability", async (req: Request, res: Response) => {
//   const { checkIn, checkOut } = req.query;

//   const hotel = await Hotel.findById(req.params.hotelId);
//   if (!hotel) {
//     return res.status(404).json({ message: "Hotel not found" });
//   }

//   const isAvailable = isRoomAvailable(hotel.bookings, new Date(checkIn), new Date(checkOut));
//   res.json({ isAvailable });
// });

// function isRoomAvailable(bookings: BookingType[], checkIn: Date, checkOut: Date): boolean {
//   for (let booking of bookings) {
//     if (
//       (checkIn >= booking.checkIn && checkIn < booking.checkOut) ||
//       (checkOut > booking.checkIn && checkOut <= booking.checkOut)
//     ) {
//       // The requested booking dates overlap with an existing booking
//       return false;
//     }
//   }

//   // The requested booking dates do not overlap with any existing bookings
//   return true;
// }

export default router;
