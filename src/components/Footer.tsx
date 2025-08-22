export default function Footer() {
  return (
    <footer className="absolute bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-10 text-xs text-gray-500 dark:text-gray-500">
          <span>Developed by Martin M</span>
          <a
            href="https://x.com/devsec_ai"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 flex items-center hover:text-gray-900 dark:hover:text-white transition-colors"
            aria-label="Follow on X (Twitter)"
          >
            {/* X (Twitter) Icon */}
            <svg
              className="w-4 h-4 mr-1"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span className="font-medium">@devsec_ai</span>
          </a>
        </div>
      </div>
    </footer>
  );
}