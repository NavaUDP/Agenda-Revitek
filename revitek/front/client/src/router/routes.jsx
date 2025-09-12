import { createBrowserRouter } from 'react-router-dom';
import Home from '../pages/Home';
// Import other pages as needed
// import Reservas from '../pages/Reservas';
// import Recordatorio from '../pages/Recordatorio';
// import Estado from '../pages/Estado';
// import AdminPanel from '../pages/Admin/Panel';

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  // Add other routes here when you create the pages
  // {
  //   path: "/reservas",
  //   element: <Reservas />,
  // },
  // {
  //   path: "/recordatorio", 
  //   element: <Recordatorio />,
  // },
  // {
  //   path: "/estado",
  //   element: <Estado />,
  // },
  // {
  //   path: "/admin",
  //   element: <AdminPanel />,
  // },
]);