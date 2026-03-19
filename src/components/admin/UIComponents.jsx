import React, { useState, useRef, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';

export function CustomSelect({ value, onChange, options, className = '' }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div className={`admin-custom-select ${className}`} ref={containerRef}>
      <button 
        type="button" 
        className={`admin-select-trigger ${open ? 'open' : ''}`} 
        onClick={() => setOpen(!open)}
      >
        <span>{selectedOption?.label || 'Select...'}</span>
        <i className="fa-solid fa-chevron-down" />
      </button>
      
      {open && (
        <div className="admin-select-dropdown">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`admin-select-option ${value === opt.value ? 'selected' : ''}`}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
              {value === opt.value && <i className="fa-solid fa-check" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CustomDatePicker({ value, onChange, className = '' }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // value is expected to be 'YYYY-MM-DD'
  let date = new Date();
  if (value) {
    const parts = value.split('-');
    if (parts.length === 3) {
      date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
  }

  const handleSelect = (d) => {
    if (d) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      onChange(`${yyyy}-${mm}-${dd}`);
      setOpen(false);
    }
  };

  const formattedDate = value ? `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}` : 'Select date';

  return (
    <div className={`admin-custom-datepicker ${className}`} ref={containerRef}>
      <button 
        type="button" 
        className={`admin-datepicker-trigger ${open ? 'open' : ''}`} 
        onClick={() => setOpen(!open)}
      >
        <i className="fa-regular fa-calendar" />
        <span>{formattedDate}</span>
      </button>
      
      {open && (
        <div className="admin-datepicker-dropdown">
          <DayPicker
            mode="single"
            selected={date}
            onSelect={handleSelect}
            showOutsideDays
          />
        </div>
      )}
    </div>
  );
}
