import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

export interface CountryItem {
  id: string;
  name: string;
  nativeName?: string;
  code: string; // Dialing code, e.g. "+251"
  flag: string; // Emoji flag
  carriers?: string; // Carrier info e.g. "Ethio Telecom, Safaricom"
  region?: string; // Regional info e.g. "Dubai, Abu Dhabi" or "Beirut"
  placeholder: string;
}

export const SUPPORTED_COUNTRIES: CountryItem[] = [
  {
    id: 'ET',
    name: 'Ethiopia',
    nativeName: 'Itoophiyaa / ኢትዮጵያ',
    code: '+251',
    flag: '🇪🇹',
    carriers: 'Ethio Telecom, Safaricom',
    placeholder: '91 123 4567',
  },
  {
    id: 'SA',
    name: 'Saudi Arabia',
    nativeName: 'المملكة العربية السعودية',
    code: '+966',
    flag: '🇸🇦',
    carriers: 'STC, Mobily, Zain',
    placeholder: '50 123 4567',
  },
  {
    id: 'QA',
    name: 'Qatar',
    nativeName: 'قطر',
    code: '+974',
    flag: '🇶🇦',
    carriers: 'Ooredoo, Vodafone',
    placeholder: '33 12 34 56',
  },
  {
    id: 'AE',
    name: 'United Arab Emirates / Dubai',
    nativeName: 'الإمارات العربية المتحدة (دبي)',
    code: '+971',
    flag: '🇦🇪',
    region: 'Dubai / Abu Dhabi',
    carriers: 'e& (Etisalat), du',
    placeholder: '50 123 4567',
  },
  {
    id: 'LB',
    name: 'Lebanon / Beirut',
    nativeName: 'لبنان (بيروت)',
    code: '+961',
    flag: '🇱🇧',
    region: 'Beirut',
    carriers: 'Touch, Alfa',
    placeholder: '3 123 456',
  },
  {
    id: 'CA',
    name: 'Canada',
    nativeName: 'Canada',
    code: '+1',
    flag: '🇨🇦',
    carriers: 'Rogers, Bell, Telus',
    placeholder: '416 123 4567',
  },
  {
    id: 'JO',
    name: 'Jordan',
    nativeName: 'الأردن',
    code: '+962',
    flag: '🇯🇴',
    carriers: 'Zain, Orange, Umniah',
    placeholder: '7 9123 4567',
  },
  {
    id: 'US',
    name: 'United States',
    nativeName: 'USA',
    code: '+1',
    flag: '🇺🇸',
    carriers: 'Verizon, AT&T, T-Mobile',
    placeholder: '202 555 0143',
  },
  {
    id: 'GB',
    name: 'United Kingdom',
    nativeName: 'UK',
    code: '+44',
    flag: '🇬🇧',
    carriers: 'EE, Vodafone, O2',
    placeholder: '7911 123456',
  },
  {
    id: 'KE',
    name: 'Kenya',
    nativeName: 'Kenya',
    code: '+254',
    flag: '🇰🇪',
    carriers: 'Safaricom, Airtel',
    placeholder: '712 345 678',
  },
  {
    id: 'DE',
    name: 'Germany',
    nativeName: 'Deutschland',
    code: '+49',
    flag: '🇩🇪',
    carriers: 'Telekom, Vodafone, O2',
    placeholder: '151 23456789',
  },
];

interface CountrySelectProps {
  selectedCountry: CountryItem;
  onSelectCountry: (country: CountryItem) => void;
}

export const CountrySelect: React.FC<CountrySelectProps> = ({
  selectedCountry,
  onSelectCountry,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCountries = SUPPORTED_COUNTRIES.filter((c) => {
    const q = search.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.includes(q) ||
      (c.nativeName && c.nativeName.toLowerCase().includes(q)) ||
      (c.carriers && c.carriers.toLowerCase().includes(q)) ||
      (c.region && c.region.toLowerCase().includes(q))
    );
  });

  return (
    <div className="country-select-wrapper" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        className="country-select-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Choose Country"
      >
        <span className="country-flag-icon">{selectedCountry.flag}</span>
        <span className="country-dial-code">{selectedCountry.code}</span>
        <ChevronDown size={16} className={`chevron-icon ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="country-dropdown-popover animate-fade-in">
          <div className="country-search-bar">
            <Search size={16} className="text-muted" />
            <input
              type="text"
              className="country-search-input"
              placeholder="Search country or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          <div className="country-list-scroll">
            {filteredCountries.length === 0 ? (
              <div className="country-no-results">No countries found</div>
            ) : (
              filteredCountries.map((country) => {
                const isSelected = country.id === selectedCountry.id;
                return (
                  <div
                    key={country.id}
                    className={`country-item-option interactive-item ${
                      isSelected ? 'country-selected' : ''
                    }`}
                    onClick={() => {
                      onSelectCountry(country);
                      setIsOpen(false);
                      setSearch('');
                    }}
                  >
                    <span className="country-option-flag">{country.flag}</span>

                    <div className="country-option-details">
                      <div className="country-option-name-row">
                        <span className="country-option-name">{country.name}</span>
                        {country.carriers && (
                          <span className="country-carrier-tag">{country.carriers}</span>
                        )}
                      </div>
                      {country.nativeName && (
                        <span className="country-option-native">{country.nativeName}</span>
                      )}
                    </div>

                    <span className="country-option-code">{country.code}</span>
                    {isSelected && <Check size={16} className="text-accent ml-1" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
