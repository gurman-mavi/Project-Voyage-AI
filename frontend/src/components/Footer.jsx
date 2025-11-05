export default function Footer() {
    return (
      <footer className="border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-sm text-neutral-600 flex flex-col sm:flex-row gap-2 justify-between">
          <div>© {new Date().getFullYear()} Voyage</div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-neutral-900">Privacy</a>
            <a href="#" className="hover:text-neutral-900">Terms</a>
            <a href="#" className="hover:text-neutral-900">Support</a>
          </div>
        </div>
      </footer>
    );
  }
  