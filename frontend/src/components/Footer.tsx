export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-6 text-center text-xs text-gray-400">
        &copy; {new Date().getFullYear()} YourName &middot; Powered by FastAPI + React
      </div>
    </footer>
  );
}
