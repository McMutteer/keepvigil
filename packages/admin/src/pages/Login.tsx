export function Login() {
  return (
    <div className="min-h-screen bg-bg-deep flex items-center justify-center">
      <div className="text-center">
        <img src="/brand/icon.svg" alt="Vigil" className="w-12 h-12 mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-text-primary mb-2">Vigil Admin</h1>
        <p className="text-sm text-text-muted mb-6">Sign in with GitHub to continue</p>
        <a
          href="/api/auth/login"
          className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg-deep font-medium px-6 py-2.5 rounded-lg transition-colors"
        >
          Sign in with GitHub
        </a>
      </div>
    </div>
  );
}
