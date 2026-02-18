import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <nav className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 md:space-x-4">
          <h1 className="text-lg md:text-2xl font-bold text-gray-800 flex items-center space-x-2 md:space-x-3">
            <img 
              src="https://www.sssism.org/images/logo.png" 
              alt="SSSISM Logo" 
              className="h-8 w-8 md:h-10 md:w-10 object-contain"
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'inline'; }}
            />
            <span className="hidden" style={{display: 'none'}}>🏫</span>
            <span className="hidden sm:inline">Sant Singaji Educational Society</span>
            <span className="sm:hidden">SSES</span>
          </h1>
          <span className="text-xs md:text-sm text-gray-500 hidden md:block">
            {user?.department} Department
          </span>
        </div>
        
        <div className="flex items-center space-x-2 md:space-x-4">
          <div className="flex items-center space-x-2 md:space-x-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center text-white font-semibold text-sm md:text-base">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.department}</p>
            </div>
          </div>
          
          <button
            onClick={logout}
            className="px-3 md:px-4 py-1.5 md:py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-medium text-xs md:text-sm"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
