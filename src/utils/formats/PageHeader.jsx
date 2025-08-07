// src/utils/formats/PageHeader.jsx
// Reusable PageHeader component for consistent page titles across the application
const PageHeader = ({ title }) => {
  return (
    <header className="bg-background p-4 border-b-2 border-gray-200 mb-4">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-700 text-center">{title}</h1>
    </header>
  );
};

export default PageHeader;