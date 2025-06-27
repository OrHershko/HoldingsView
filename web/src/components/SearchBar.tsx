import { useState, RefObject } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useStockSearch } from '@/hooks/useMarketData';
import type { SymbolSearchResult } from '@/types/api';

interface SearchBarProps {
  onSelect: (symbol: string) => void;
  inputRef?: RefObject<HTMLInputElement>;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSelect, inputRef }) => {
  const [query, setQuery] = useState('');
  const { results, loading } = useStockSearch(query);

  const handleSelect = (symbol: string) => {
    onSelect(symbol);
    setQuery('');
  };

  return (
    <div className="relative w-64">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ios-gray h-4 w-4 pointer-events-none" />
      <Input
        id="stock-search"
        name="stock-search"
        type="search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search stocks..."
        className="pl-9 rounded-full bg-ios-light-gray border-0 text-black"
        autoComplete="off"
        ref={inputRef}
      />
      {query && (
        <div className="absolute z-10 mt-1 w-full bg-white text-black rounded shadow-lg max-h-60 overflow-y-auto border border-gray-200">
          {loading ? (
            <div className="p-3 text-center text-gray-500">Searching...</div>
          ) : results.length === 0 ? (
            <div className="p-3 text-center text-gray-500">No results</div>
          ) : (
            (results as SymbolSearchResult[])
              .filter((item, index, array) => 
                array.findIndex(other => other.symbol === item.symbol) === index
              )
              .map((item, index) => (
                <div
                  key={`${item.symbol}-${index}`}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleSelect(item.symbol)}
                >
                  <span className="font-semibold">{item.symbol}</span>
                  {item.shortname && <span className="ml-2 text-gray-600">{item.shortname}</span>}
                  {item.exchDisp && <span className="ml-2 text-xs text-gray-400">({item.exchDisp})</span>}
                </div>
              ))
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
