{/* Replace the existing Footer block at the bottom of your Home component */}
<footer className="border-t border-border bg-card py-12">
  <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-muted-foreground">
    <div>
      <p>&copy; 2026 PetAlert Warning System. All rights reserved.</p>
      <p className="text-xs mt-1">Protecting residential properties and critical dependents across municipal networks.</p>
    </div>
    <div className="flex items-center gap-6">
      <a href="https://petalertwarningsys.com/privacy" className="hover:text-foreground transition-smooth">Privacy Policy</a>
      <a href="https://petalertwarningsys.com/terms" className="hover:text-foreground transition-smooth">Terms of Service</a>
      <a 
        href="mailto:nycpetalertwarningsystem@gmail.com" 
        className="text-accent hover:underline font-medium flex items-center gap-1"
      >
        Support: nycpetalertwarningsystem@gmail.com
      </a>
    </div>
  </div>
</footer>
