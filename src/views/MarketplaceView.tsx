import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { ShoppingBag, Plus, Phone, MapPin, Tag, Search, Image as ImageIcon, X } from "lucide-react";
import clsx from "clsx";

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  condition: "New" | "Like New" | "Good" | "Fair";
  category: string;
  sellerName: string;
  phone: string;
  location: string;
  imageUrl?: string;
  createdAt: number;
}

const CATEGORIES = ["Electronics", "Textbooks", "Furniture", "Clothing", "Other"];
const CONDITIONS = ["New", "Like New", "Good", "Fair"];

export function MarketplaceView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState<"New" | "Like New" | "Good" | "Fair">("Good");
  const [category, setCategory] = useState("Electronics");
  const [sellerName, setSellerName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("campusMarketplace");
    if (saved) {
      setProducts(JSON.parse(saved));
    } else {
      // Mock data
      const mockProducts: Product[] = [
        {
          id: "1",
          title: "Calculus Early Transcendentals 9th Ed",
          description: "Used for one semester. Some highlighting but overall good condition.",
          price: 45,
          condition: "Good",
          category: "Textbooks",
          sellerName: "Alex M.",
          phone: "+1 (555) 123-4567",
          location: "Library Cafe",
          imageUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&q=80",
          createdAt: Date.now() - 86400000,
        },
        {
          id: "2",
          title: "Mini Fridge - Perfect for Dorm",
          description: "Works perfectly. Moving out so don't need it anymore. Cleaned inside.",
          price: 60,
          condition: "Like New",
          category: "Furniture",
          sellerName: "Sarah J.",
          phone: "+1 (555) 987-6543",
          location: "North Dorms",
          imageUrl: "https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=400&q=80",
          createdAt: Date.now() - 172800000,
        }
      ];
      setProducts(mockProducts);
      localStorage.setItem("campusMarketplace", JSON.stringify(mockProducts));
    }
  }, []);

  const saveProducts = (newProducts: Product[]) => {
    setProducts(newProducts);
    localStorage.setItem("campusMarketplace", JSON.stringify(newProducts));
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price || !sellerName || !phone) return;

    const newProduct: Product = {
      id: Date.now().toString(),
      title,
      description,
      price: parseFloat(price),
      condition,
      category,
      sellerName,
      phone,
      location,
      imageUrl,
      createdAt: Date.now()
    };

    saveProducts([newProduct, ...products]);
    setIsAddingProduct(false);
    resetForm();
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPrice("");
    setCondition("Good");
    setCategory("Electronics");
    setSellerName("");
    setPhone("");
    setLocation("");
    setImageUrl("");
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "All" || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex bg-[#09090e] h-full text-white overflow-hidden relative">
      <div className="flex-1 flex flex-col h-full max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="p-6 md:p-10 shrink-0 border-b border-white/5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">Campus Marketplace</h1>
              <p className="text-gray-400">Buy and sell items within the campus community.</p>
            </div>
            <button 
              onClick={() => setIsAddingProduct(true)}
              className="px-4 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(236,72,153,0.3)] hover:shadow-[0_0_30px_rgba(236,72,153,0.5)] shrink-0"
            >
              <Plus className="w-5 h-5" />
              List an Item
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            {/* Categories */}
            <div className="flex items-center gap-2 overflow-x-auto w-full pb-2 md:pb-0 hide-scrollbar shrink-0">
              <button 
                onClick={() => setActiveCategory("All")}
                className={clsx("px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all", activeCategory === "All" ? "bg-white text-black" : "bg-[#1A1A24] text-gray-400 hover:text-white border border-white/5")}
              >
                All Items
              </button>
              {CATEGORIES.map(cat => (
                <button 
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={clsx("px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all", activeCategory === cat ? "bg-white text-black" : "bg-[#1A1A24] text-gray-400 hover:text-white border border-white/5")}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full md:w-72 shrink-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search items..."
                className="w-full bg-[#1A1A24] border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-pink-500/50 transition-colors placeholder:text-gray-600"
              />
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-20 bg-[#1A1A24]/30 border border-white/5 rounded-3xl">
              <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <h3 className="text-xl font-medium text-white mb-2">No items found</h3>
              <p className="text-gray-400 text-sm">Try adjusting your search or category filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map(product => (
                <div key={product.id} className="bg-[#1A1A24] border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-all flex flex-col group">
                  {/* Image Area */}
                  <div className="h-48 bg-[#09090e] border-b border-white/5 relative overflow-hidden flex items-center justify-center">
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <ImageIcon className="w-10 h-10 text-white/10" />
                    )}
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 border-t-white/20 shadow-xl flex items-center gap-1.5">
                       <Tag className="w-3.5 h-3.5 text-pink-400" />
                       <span className="font-bold text-sm text-white">${product.price.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  {/* Details Area */}
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                       <span className="text-[10px] uppercase tracking-wider font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">
                         {product.category}
                       </span>
                       <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                         {product.condition}
                       </span>
                    </div>
                    
                    <h3 className="font-bold text-lg text-white mb-1 line-clamp-2 leading-tight">{product.title}</h3>
                    <p className="text-sm text-gray-400 mb-4 line-clamp-2 flex-1">{product.description}</p>
                    
                    <div className="space-y-2 mt-auto pt-4 border-t border-white/5">
                      <div className="flex items-center gap-2 text-xs text-gray-300">
                        <MapPin className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                        <span className="truncate">{product.location || "Location not specified"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-300">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-pink-500 to-orange-400 flex items-center justify-center text-[8px] font-bold text-white shrink-0">
                          {product.sellerName.charAt(0)}
                        </div>
                        <span className="truncate">{product.sellerName}</span>
                        <span className="text-gray-500 ml-auto">{format(product.createdAt, "MMM d")}</span>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => {
                        window.location.href = `tel:${product.phone}`;
                      }}
                      className="mt-4 w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm font-bold text-white"
                    >
                      <Phone className="w-4 h-4 text-emerald-400" />
                      Contact Seller
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Product Modal */}
      {isAddingProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1A1A24] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-[#09090e]/50">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-pink-400" />
                List an Item
              </h2>
              <button 
                onClick={() => setIsAddingProduct(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <form id="add-product-form" onSubmit={handleAddProduct} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Item Title *</label>
                      <input 
                        type="text" 
                        required
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="e.g. Calculus Textbook, Mini Fridge"
                        className="w-full bg-[#09090e] border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-pink-500/50"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Price ($) *</label>
                        <input 
                          type="number" 
                          required
                          min="0"
                          step="0.01"
                          value={price}
                          onChange={e => setPrice(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-[#09090e] border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-pink-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Condition *</label>
                        <select 
                          value={condition}
                          onChange={e => setCondition(e.target.value as any)}
                          className="w-full bg-[#09090e] border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-pink-500/50 appearance-none"
                        >
                          {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Category *</label>
                      <select 
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        className="w-full bg-[#09090e] border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-pink-500/50 appearance-none"
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Image URL (Optional)</label>
                      <input 
                        type="url" 
                        value={imageUrl}
                        onChange={e => setImageUrl(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="w-full bg-[#09090e] border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-pink-500/50"
                      />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Description</label>
                      <textarea 
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Describe the item, any damages, why you're selling..."
                        rows={4}
                        className="w-full bg-[#09090e] border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-pink-500/50 resize-none"
                      />
                    </div>
                    
                    <div className="bg-[#09090e] border border-white/5 rounded-xl p-4 space-y-3">
                       <h4 className="text-sm font-bold text-white mb-2">Seller Contact Info</h4>
                       <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Your Name *</label>
                        <input 
                          type="text" 
                          required
                          value={sellerName}
                          onChange={e => setSellerName(e.target.value)}
                          placeholder="e.g. John Doe"
                          className="w-full bg-[#1A1A24] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-pink-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Phone Number *</label>
                        <input 
                          type="tel" 
                          required
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          placeholder="Used for buyers to contact you"
                          className="w-full bg-[#1A1A24] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-pink-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Meetup Location</label>
                        <input 
                          type="text" 
                          value={location}
                          onChange={e => setLocation(e.target.value)}
                          placeholder="e.g. Main Library, Student Center"
                          className="w-full bg-[#1A1A24] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-pink-500/50"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-white/5 flex items-center justify-end gap-3 shrink-0 bg-[#09090e]/50">
               <button 
                type="button"
                onClick={() => setIsAddingProduct(false)}
                className="px-5 py-2 font-bold text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
               >
                 Cancel
               </button>
               <button 
                type="submit"
                form="add-product-form"
                className="px-6 py-2 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(236,72,153,0.3)]"
               >
                 Post Item
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
