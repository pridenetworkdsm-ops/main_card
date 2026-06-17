import { useEffect, useState, useMemo } from 'react';
import { Search, SlidersHorizontal, X, LayoutGrid } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';
import ProductCard from '../components/ProductCard';
import { CARD_TYPES, RARITIES, CARD_TYPE_ACCENT } from '../lib/constants';

interface CatalogPageProps {
  onViewProduct: (id: string) => void;
  initialType?: string;
}

export default function CatalogPage({ onViewProduct, initialType }: CatalogPageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState(initialType ?? '');
  const [rarityFilter, setRarityFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('in_stock', true)
        .order('created_at', { ascending: false });
      if (error) {
        setFetchError(error.message);
      } else {
        setProducts(data ?? []);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    let result = [...products];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          (p.description ?? '').toLowerCase().includes(s) ||
          (p.set_name ?? '').toLowerCase().includes(s)
      );
    }
    if (typeFilter) result = result.filter((p) => p.card_type === typeFilter);
    if (rarityFilter) result = result.filter((p) => p.rarity === rarityFilter);

    switch (sortBy) {
      case 'price-low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return result;
  }, [products, search, typeFilter, rarityFilter, sortBy]);

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('');
    setRarityFilter('');
    setSortBy('newest');
  };

  const hasFilters = !!(search || typeFilter || rarityFilter);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <LayoutGrid className="w-4 h-4 text-red-500" />
                <span className="text-xs font-semibold text-red-500 uppercase tracking-widest">All Cards</span>
              </div>
              <h1
                className="text-3xl font-bold text-gray-900"
                style={{ fontFamily: 'Rajdhani, Inter, sans-serif' }}
              >
                Card Catalog
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {loading ? 'Loading...' : `${filtered.length} card${filtered.length !== 1 ? 's' : ''} available`}
              </p>
            </div>

            {/* Search + controls */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search cards, sets..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent focus:bg-white transition-colors"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2.5 rounded-xl border transition-all ${
                  showFilters
                    ? 'bg-red-600 border-red-600 text-white shadow-md shadow-red-900/20'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
              >
                <option value="newest">Newest</option>
                <option value="price-low">Price: Low → High</option>
                <option value="price-high">Price: High → Low</option>
                <option value="name">Name A–Z</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Expanded filters */}
        {showFilters && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">Filter By</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Card Type
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setTypeFilter('')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      !typeFilter
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    All Types
                  </button>
                  {CARD_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTypeFilter(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        typeFilter === t
                          ? `${CARD_TYPE_ACCENT[t] ?? 'bg-gray-800'} text-white border-transparent`
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Rarity
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setRarityFilter('')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      !rarityFilter
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    All Rarities
                  </button>
                  {RARITIES.map((r) => (
                    <button
                      key={r}
                      onClick={() => setRarityFilter(r)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        rarityFilter === r
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="mt-5 text-sm text-red-600 hover:text-red-700 font-semibold flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Active filter chips */}
        {hasFilters && (
          <div className="flex flex-wrap gap-2 mb-5">
            {typeFilter && (
              <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-red-200">
                Type: {typeFilter}
                <button onClick={() => setTypeFilter('')} className="hover:text-red-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {rarityFilter && (
              <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-red-200">
                Rarity: {rarityFilter}
                <button onClick={() => setRarityFilter('')} className="hover:text-red-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {search && (
              <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-gray-200">
                "{search}"
                <button onClick={() => setSearch('')} className="hover:text-gray-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Card grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-200 rounded-xl h-64" />
            ))}
          </div>
        ) : fetchError ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-red-300" />
            </div>
            <p className="text-gray-600 font-medium mb-1">Unable to load products</p>
            <p className="text-gray-400 text-sm mb-5">{fetchError}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-red-600 hover:text-red-700 font-semibold text-sm"
            >
              Try again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-600 font-medium mb-1">No cards found</p>
            <p className="text-gray-400 text-sm mb-5">Try adjusting your search or filters</p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-red-600 hover:text-red-700 font-semibold text-sm"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} onView={onViewProduct} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
