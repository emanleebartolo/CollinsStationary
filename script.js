const defaultProducts=[
{id:1,name:"Classic Blue Ballpoint Pen",category:"Writing",price:.65,stock:45,icon:"🖊️",description:"A reliable everyday ballpoint pen with a comfortable grip. Ideal for notes, lists and everyday writing."},
{id:2,name:"HB Graphite Pencil",category:"Writing",price:.40,stock:60,icon:"✏️",description:"A classic HB pencil for writing, sketching and school work."},
{id:3,name:"A5 Exercise Book",category:"Notebooks",price:1.25,stock:32,icon:"📓",description:"A practical exercise book for school notes, homework and everyday use."},
{id:4,name:"Hardcover Notebook",category:"Notebooks",price:3.95,stock:18,icon:"📔",description:"A smart hardcover notebook for ideas, planning and journaling."},
{id:5,name:"Colouring Pencils – 12 Pack",category:"Art",price:4.50,stock:12,icon:"🖍️",description:"A colourful set for drawing, colouring and creative projects."},
{id:6,name:"School Pencil Case",category:"School",price:5.90,stock:9,icon:"🎒",description:"A handy pencil case to keep writing essentials organised."},
{id:7,name:"A4 Copy Paper – Ream",category:"Office",price:5.50,stock:20,icon:"📄",description:"Everyday A4 copy paper for home, school and office printing."},
{id:8,name:"Desktop Stapler",category:"Office",price:3.75,stock:14,icon:"📎",description:"A compact desktop stapler for everyday office organisation."},
{id:9,name:"Watercolour Paint Set",category:"Art",price:8.50,stock:7,icon:"🎨",description:"A starter watercolour set for creative projects and school art."},
{id:10,name:"Colourful Highlighters – 4 Pack",category:"Writing",price:3.20,stock:25,icon:"🖍️",description:"Bright highlighters for revision, study notes and organising documents."},
{id:11,name:"Ring Binder A4",category:"Office",price:2.80,stock:16,icon:"📁",description:"A practical A4 ring binder for keeping paperwork organised."},
{id:12,name:"Gift Wrap Set",category:"Gifts",price:4.95,stock:8,icon:"🎁",description:"A gift wrap set for birthdays, celebrations and special occasions."}
];
const euro=n=>"€"+Number(n).toFixed(2);
let products=defaultProducts.map(p=>({...p})),cart={},activeCategory="All",view="grid",orders=0;
function loadProducts(){return defaultProducts.map(p=>({...p}))}
function saveProducts(){}

async function syncLiveProducts(){
  try{
    const response=await fetch("/api/products",{headers:{"Accept":"application/json"}});
    if(!response.ok) return;
    const data=await response.json();
    if(Array.isArray(data.products)){
      products=data.products.map(p=>({id:p.id,name:p.name,category:p.category,price:Number(p.price_cents)/100,stock:Number(p.stock),icon:p.icon||"📦",description:p.description||""}));
      renderProducts();
    }
  }catch(e){/* Keep sample catalogue visible if the backend has not been configured yet. */}
}

function renderProducts(){
 const q=document.getElementById("searchInput").value.trim().toLowerCase();
 const stockOnly=document.getElementById("inStockOnly").checked;
 const price=document.querySelector('input[name="price"]:checked')?.value||"all";
 let list=products.filter(p=>(activeCategory==="All"||p.category===activeCategory)&&(!stockOnly||p.stock>0)&&(!q||p.name.toLowerCase().includes(q)||p.category.toLowerCase().includes(q)||p.description.toLowerCase().includes(q)));
 if(price==="0-5")list=list.filter(p=>p.price<5);if(price==="5-15")list=list.filter(p=>p.price>=5&&p.price<=15);if(price==="15+")list=list.filter(p=>p.price>15);
 const sort=document.getElementById("sortSelect").value;if(sort==="price-low")list.sort((a,b)=>a.price-b.price);if(sort==="price-high")list.sort((a,b)=>b.price-a.price);if(sort==="name")list.sort((a,b)=>a.name.localeCompare(b.name));
 document.getElementById("resultCount").textContent=`Showing ${list.length} of ${products.length} products`;
 const grid=document.getElementById("productGrid");grid.className="products"+(view==="list"?" list":"");
 grid.innerHTML=list.length?list.map(p=>`<article class="product-card"><div class="product-image" onclick="openProduct(${JSON.stringify(p.id)})"><span class="stock-tag ${p.stock<1?"out":""}">${p.stock>0?"IN STOCK":"OUT OF STOCK"}</span>${p.icon}</div><div class="product-body"><span class="product-category">${p.category}</span><div class="product-title" onclick="openProduct(${JSON.stringify(p.id)})">${escapeHtml(p.name)}</div><div class="product-meta">${p.stock>0?`${p.stock} available in demo stock`:"Currently unavailable"}</div><div class="product-bottom"><span class="product-price">${euro(p.price)}</span><button class="add-btn" ${p.stock<1?"disabled":""} onclick="addToCart(${JSON.stringify(p.id)})">＋ Add to basket</button></div></div></article>`).join(""):`<div class="empty-state">No products match your search.<br><br>Try another keyword or clear your filters.</div>`;
 renderAdmin();
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function chooseCategory(c,e){activeCategory=c;document.querySelectorAll(".category-tile").forEach(b=>b.classList.toggle("selected",b.dataset.category===c));document.querySelectorAll('input[name="category"]').forEach(i=>i.checked=i.value===c);document.querySelectorAll(".nav a").forEach(a=>a.classList.remove("active"));if(e)e.currentTarget.classList.add("active");renderProducts()}
function clearFilters(){activeCategory="All";document.getElementById("searchInput").value="";document.getElementById("inStockOnly").checked=false;document.querySelector('input[name="price"][value="all"]').checked=true;document.querySelector('input[name="category"][value="All"]').checked=true;chooseCategory("All");renderProducts()}
function setView(v){view=v;document.getElementById("gridBtn").classList.toggle("active",v==="grid");document.getElementById("listBtn").classList.toggle("active",v==="list");renderProducts()}
function addToCart(id){const p=products.find(x=>String(x.id)===String(id));if(!p||p.stock<=0)return;cart[id]=(cart[id]||0)+1;updateCart();toast(`${p.name} added to basket`)}
function updateCart(){const count=Object.values(cart).reduce((a,b)=>a+b,0);document.getElementById("cartCount").textContent=count;renderAdmin()}
function openCart(){document.getElementById("cartOverlay").classList.add("show");document.getElementById("drawerTitle").textContent="Your basket";renderCart()}
function closeCart(){document.getElementById("cartOverlay").classList.remove("show")}
function renderCart(){
 const items=Object.entries(cart).map(([id,q])=>({p:products.find(p=>String(p.id)===String(id)),q})).filter(x=>x.p);
 const el=document.getElementById("drawerContent");
 if(!items.length){el.innerHTML='<div class="empty-state" style="margin-top:22px">Your basket is empty.<br><br>Explore the collection and add something you need.</div>';return}
 const total=items.reduce((s,x)=>s+x.p.price*x.q,0);
 el.innerHTML=items.map(x=>`<div class="cart-line"><div class="mini-image">${x.p.icon}</div><div><strong>${escapeHtml(x.p.name)}</strong><small>${euro(x.p.price)} each</small><div class="qty-control"><button onclick="changeQty(${x.p.id},-1)">−</button><span>${x.q}</span><button onclick="changeQty(${x.p.id},1)">＋</button></div></div><strong>${euro(x.p.price*x.q)}</strong></div>`).join("")+`<div class="cart-total"><span>Subtotal</span><span>${euro(total)}</span></div><button class="full-btn" onclick="checkout()">PROCEED TO CHECKOUT</button><button class="subtle-btn" onclick="closeCart()">CONTINUE SHOPPING</button><p style="font-size:10px;color:#92999d;line-height:1.6">Delivery fees, if applicable, are confirmed before order completion.</p>`;
}
function changeQty(id,d){const p=products.find(x=>String(x.id)===String(id));cart[id]=Math.max(0,Math.min(p.stock,(cart[id]||0)+d));if(!cart[id])delete cart[id];updateCart();renderCart()}
function checkout(){
 const items=Object.entries(cart).map(([id,q])=>({p:products.find(p=>String(p.id)===String(id)),q})).filter(x=>x.p);if(!items.length)return;
 const total=items.reduce((s,x)=>s+x.p.price*x.q,0);
 document.getElementById("drawerTitle").textContent="Checkout";
 document.getElementById("drawerContent").innerHTML=`<div class="notice"><b>Demonstration checkout.</b> This preview does not take real payments or send orders to Collins Stationery.</div><div class="form-field"><label>Full name</label><input id="customerName" placeholder="Your full name" required></div><div class="form-field"><label>Email address</label><input id="customerEmail" type="email" placeholder="name@example.com" required></div><div class="form-field"><label>Mobile number</label><input id="customerPhone" type="tel" placeholder="+356 ..." required></div><b style="font-size:12px">How would you like to receive your order?</b><label class="delivery-choice"><input type="radio" name="fulfilment" value="collection" checked onchange="toggleAddress()"> 🏬 Click & Collect – Collins Stationery, Rabat</label><label class="delivery-choice"><input type="radio" name="fulfilment" value="delivery" onchange="toggleAddress()"> 🚚 Home delivery</label><div id="addressField" class="form-field" style="display:none"><label>Delivery address</label><input id="deliveryAddress" placeholder="Street, locality and postcode"></div><div class="form-field"><label>Payment method</label><select disabled><option>Online card payment – integration required</option></select></div><div class="cart-total"><span>Order subtotal</span><span>${euro(total)}</span></div><button class="full-btn" onclick="placeDemoOrder()">PLACE DEMO ORDER</button><button class="subtle-btn" onclick="renderCart()">BACK TO BASKET</button>`;
}
function toggleAddress(){document.getElementById("addressField").style.display=document.querySelector('input[name="fulfilment"]:checked').value==="delivery"?"block":"none"}
function placeDemoOrder(){
 const name=document.getElementById("customerName").value.trim(),email=document.getElementById("customerEmail").value.trim(),phone=document.getElementById("customerPhone").value.trim(),method=document.querySelector('input[name="fulfilment"]:checked').value;
 if(!name||!email||!phone){toast("Please complete your contact details");return}
 if(method==="delivery"&&!document.getElementById("deliveryAddress").value.trim()){toast("Please enter your delivery address");return}
 Object.entries(cart).forEach(([id,q])=>{const p=products.find(x=>String(x.id)===String(id));if(p)p.stock=Math.max(0,p.stock-q)});
 cart={};orders++;saveProducts();updateCart();renderProducts();
 document.getElementById("drawerTitle").textContent="Order confirmation";
 document.getElementById("drawerContent").innerHTML=`<div class="confirmation"><div class="check">✓</div><h3>Thank you, ${escapeHtml(name)}!</h3><p style="font-size:12px;color:#62736a;line-height:1.7">Your demonstration order has been recorded in this browser session.</p><p style="font-size:11px;color:#718079"><b>Fulfilment:</b> ${method==="delivery"?"Home delivery":"Shop collection"}</p><p style="font-size:10px;color:#8a9690">No payment was processed and Collins Stationery has not received this order.</p></div><button class="full-btn" style="margin-top:16px" onclick="closeCart()">CONTINUE SHOPPING</button>`;
}
function openProduct(id){const p=products.find(x=>String(x.id)===String(id));if(!p)return;document.getElementById("modalContent").innerHTML=`<div class="modal-content"><div class="modal-visual">${p.icon}</div><div class="modal-info"><span class="product-category">${p.category}</span><h2>${escapeHtml(p.name)}</h2><p>${escapeHtml(p.description)}</p><div class="modal-price">${euro(p.price)}</div><p>${p.stock>0?`${p.stock} available in demo stock`:"Currently unavailable"}</p><button class="full-btn" ${p.stock<1?"disabled":""} onclick="addToCart(${p.id});closeProductModal()">ADD TO BASKET</button><button class="subtle-btn" onclick="closeProductModal()">CLOSE</button></div></div>`;document.getElementById("productModal").classList.add("show")}
function closeProductModal(){document.getElementById("productModal").classList.remove("show")}
function addProduct(){const name=document.getElementById("newProductName").value.trim(),price=Number(document.getElementById("newProductPrice").value),category=document.getElementById("newProductCategory").value,stock=Math.max(0,Number(document.getElementById("newProductStock").value)||0);if(!name||!Number.isFinite(price)||price<0){toast("Enter a valid product name and price");return}products.push({id:Math.max(0,...products.map(p=>p.id))+1,name,category,price,stock,icon:"📦",description:"Product description to be added."});saveProducts();document.getElementById("newProductName").value="";document.getElementById("newProductPrice").value="";renderProducts();toast("Product added to demo catalogue")}
function removeProduct(id){products=products.filter(p=>p.id!==id);saveProducts();renderProducts();toast("Product removed from demo catalogue")}
function renderAdmin(){}
function toggleAdmin(){}
function scrollToAdmin(){}
let toastTimer;function toast(msg){const el=document.getElementById("toast");el.textContent=msg;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2300)}
document.getElementById("searchInput").addEventListener("input",renderProducts);document.getElementById("year").textContent=new Date().getFullYear();renderProducts();updateCart();syncLiveProducts();
