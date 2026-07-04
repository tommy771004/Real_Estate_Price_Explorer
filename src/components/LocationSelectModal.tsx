import { X, Search, MapPin } from "lucide-react";
import { useState, useMemo } from "react";
import { CITIES, CITY_DISTRICTS } from "../data/locations";

type LocationSelectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentCityName: string;
  currentDistrict: string;
  onSelect: (city: string, district: string) => void;
};

export function LocationSelectModal({
  isOpen,
  onClose,
  currentCityName,
  currentDistrict,
  onSelect,
}: LocationSelectModalProps) {
  const [selectedCity, setSelectedCity] = useState(currentCityName);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter cities and districts based on the search query
  const filteredCities = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return CITIES;

    return CITIES.filter((city) => {
      // Matches city name
      if (city.name.toLowerCase().includes(query)) return true;
      // Or any of its districts match
      const districts = CITY_DISTRICTS[city.name] ?? [];
      return districts.some((d) => d.name.toLowerCase().includes(query));
    });
  }, [searchQuery]);

  const activeDistricts = useMemo(() => {
    const districts = CITY_DISTRICTS[selectedCity] ?? [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return districts;

    // Filter districts of the active selected city if they match
    return districts.filter((d) => d.name.toLowerCase().includes(query));
  }, [selectedCity, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      className="location-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-modal-title"
      onClick={onClose}
    >
      <div
        className="location-modal-card glass-surface"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="location-modal-header">
          <div className="header-left">
            <div className="pin-icon-wrapper">
              <MapPin className="pin-icon" size={20} />
            </div>
            <div>
              <h2 id="location-modal-title">選擇區域</h2>
              <p className="subtitle">請選擇你要探索的地點</p>
            </div>
          </div>
          <button
            className="close-button"
            type="button"
            aria-label="關閉"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="location-modal-search">
          <div className="search-input-wrapper">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              placeholder="搜尋縣市或鄉鎮..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        {/* Select Columns */}
        <div className="location-columns-container">
          {/* Left Column - Cities */}
          <div className="cities-column">
            {filteredCities.map((city) => {
              const districtCount = CITY_DISTRICTS[city.name]?.length || 0;
              const isActive = selectedCity === city.name;
              return (
                <button
                  key={city.code}
                  className={`city-item-btn ${isActive ? "is-active" : ""}`}
                  type="button"
                  onClick={() => setSelectedCity(city.name)}
                >
                  <span className="city-name">{city.name}</span>
                  <span className="district-badge">{districtCount}</span>
                </button>
              );
            })}
            {filteredCities.length === 0 && (
              <div className="no-results-msg">無符合縣市</div>
            )}
          </div>

          {/* Right Column - Districts */}
          <div className="districts-column">
            {/* "全部" option */}
            {(!searchQuery || "全部".includes(searchQuery.toLowerCase())) && (
              <button
                className={`district-item-btn ${currentCityName === selectedCity && currentDistrict === "全部" ? "is-selected" : ""}`}
                type="button"
                onClick={() => {
                  onSelect(selectedCity, "全部");
                  onClose();
                }}
              >
                全部
              </button>
            )}

            {activeDistricts.map((district) => {
              const isSelected = currentCityName === selectedCity && currentDistrict === district.name;
              return (
                <button
                  key={district.code}
                  className={`district-item-btn ${isSelected ? "is-selected" : ""}`}
                  type="button"
                  onClick={() => {
                    onSelect(selectedCity, district.name);
                    onClose();
                  }}
                >
                  {district.name}
                </button>
              );
            })}

            {activeDistricts.length === 0 && (
              <div className="no-results-msg">無符合行政區</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
