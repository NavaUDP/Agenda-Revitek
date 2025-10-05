import { Outlet } from 'react-router-dom';
import Header from '../components/Header'; // Ajusta la ruta si es necesario
import Footer from '../components/Footer'; // Ajusta la ruta si es necesario

const PublicLayout = () => {
  return (
    <>
      <Header />
      <main>
        {/* Outlet es un marcador de posición de react-router-dom.
            Aquí es donde se renderizará el componente de la ruta hija (ej: LandingPage). */}
        <Outlet />
      </main>
      <Footer />
    </>
  );
};

export default PublicLayout;