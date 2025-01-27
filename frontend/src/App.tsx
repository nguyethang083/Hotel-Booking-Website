import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import Layout from "./layouts/Layout";
import Register from "./pages/Register";
import SignIn from "./pages/SignIn";
import AddHotel from "./pages/AddRoom";
import { useAppContext } from "./contexts/AppContext";
import MyHotels from "./pages/MyRooms";
import EditHotel from "./pages/EditRoom";
import Search from "./pages/Search";
import Detail from "./pages/Detail";
import Booking from "./pages/Booking";
import Home from "./pages/Home";
import MyBookings from "./pages/MyBookings";
import GuestBookings from "./pages/GuestBookings";
import UserProfile from "./pages/UserProfile";
import "./App.css";
import BookingDetailPage from "./pages/ViewMyBooking";

const App = () => {
  const { isLoggedIn, isHost } = useAppContext();

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <Layout>
              <Home />
            </Layout>
          }
        />
        <Route
          path="/search"
          element={
            <Layout>
              <Search />
            </Layout>
          }
        />
        <Route
          path="/detail/:hotelId"
          element={
            <Layout>
              <Detail />
            </Layout>
          }
        />
        <Route
          path="/register"
          element={
            <Layout>
              <Register />
            </Layout>
          }
        />
        <Route
          path="/sign-in"
          element={
            <Layout>
              <SignIn />
            </Layout>
          }
        />

        {isLoggedIn && (
          <>
            <Route
              path="/user-profile"
              element={
                <Layout>
                  <UserProfile />
                </Layout>
              }
            />
            {isHost ? (
              <>
                <Route
                  path="/add-hotel"
                  element={
                    <Layout>
                      <AddHotel />
                    </Layout>
                  }
                />
                <Route
                  path="/edit-hotel/:hotelId"
                  element={
                    <Layout>
                      <EditHotel />
                    </Layout>
                  }
                />
                <Route
                  path="/my-rooms"
                  element={
                    <Layout>
                      <MyHotels />
                    </Layout>
                  }
                />
                <Route
                  path="/hotels/:hotelId/bookings"
                  element={
                    <Layout>
                      <GuestBookings />
                    </Layout>
                  }
                />
              </>
            ) : (
              <>
                <Route
                  path="/hotel/:hotelId/booking"
                  element={
                    <Layout>
                      <Booking />
                    </Layout>
                  }
                />
                <Route
                  path="/my-bookings"
                  element={
                    <Layout>
                      <MyBookings />
                    </Layout>
                  }
                />
                <Route
                  path="/view-my-booking/:hotelId"
                  element={
                    <Layout>
                      <BookingDetailPage />
                    </Layout>
                  }
                />
              </>
            )}
          </>
        )}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default App;
