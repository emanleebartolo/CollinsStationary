const $=id=>document.getElementById(id);
const api=async(path,options={})=>{const r=await fetch(path,{...options,headers:{"content-type":"application/json",...(options.headers||{})}});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||"Request failed");return data};
let currentUser=null,productCache=[];
function say(id,msg){$(id).textContent=msg}
function toast(msg){const t=$("adminToast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}
function showLogin(){ $("loginCard").classList.remove("hidden");$("setupCard").classList.add("hidden");$("dashboard").classList.add("hidden")}
function showSetup(){ $("loginCard").classList.add("hidden");$("setupCard").classList.remove("hidden");$("dashboard").classList.add("hidden")}
function showDashboard(user){currentUser=user;$("loginCard").classList.add("hidden");$("setupCard").classList.add("hidden");$("dashboard").classList.remove("hidden");$("whoami").textContent=user.displayName||user.username;$("roleLabel").textContent=user.role==="admin"?"Administrator":"Owner";document.querySelectorAll(".admin-only").forEach(e=>e.classList.toggle("hidden",user.role!=="admin"));$("roleHelp").textContent=user.role==="owner"?"Owner access: you can update product prices and stock quantities. Contact the administrator for product creation, descriptions or other catalogue changes.":"Administrator access: you can add products, edit catalogue details, update stock and prices, and create staff accounts.";loadProducts();loadOrders()}
async function checkSession(){try{const d=await api("/api/auth");if(d.user)showDashboard(d.user);else showLogin()}catch{showLogin()}}
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();say("loginMessage","Signing in…");try{const d=await api("/api/auth/login",{method:"POST",body:JSON.stringify({username:$("loginUsername").value,password:$("loginPassword").value})});showDashboard(d.user)}catch(err){say("loginMessage",err.message)}});
$("setupForm").addEventListener("submit",async e=>{e.preventDefault();say("setupMessage","Creating administrator…");try{await api("/api/auth/setup",{method:"POST",body:JSON.stringify({setupSecret:$("setupSecret").value,displayName:$("setupName").value,username:$("setupUsername").value,password:$("setupPassword").value})});say("setupMessage","Administrator created. Please sign in.");showLogin()}catch(err){say("setupMessage",err.message)}});
$("showSetup").onclick=showSetup;$("showLogin").onclick=showLogin;
$("logoutBtn").onclick=async()=>{try{await api("/api/auth/logout",{method:"POST",body:"{}"})}finally{currentUser=null;showLogin()}};
document.querySelectorAll(".tab").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===btn));document.querySelectorAll(".tab-panel").forEach(x=>x.classList.add("hidden"));$(btn.dataset.tab+"Panel").classList.remove("hidden");if(btn.dataset.tab==="orders")loadOrders()}));
$("addProductBtn").onclick=()=>{const name=prompt("Product name");if(!name)return;const category=prompt("Category (Writing, Notebooks, School, Office, Art, Gifts)","Writing")||"Writing";const price=Number(prompt("Price in euros","1.00"));const stock=Number(prompt("Initial stock quantity","0"));const description=prompt("Product description (optional)","")||"";if(!Number.isFinite(price)||price<0||!Number.isInteger(stock)||stock<0){toast("Invalid price or stock quantity");return}api("/api/products",{method:"POST",body:JSON.stringify({name,category,price_cents:Math.round(price*100),stock,description,icon:"📦"})}).then(()=>{toast("Product added");loadProducts()}).catch(e=>toast(e.message))};
async function loadProducts(){try{const d=await api("/api/products");productCache=d.products||[];renderProducts()}catch(e){toast(e.message)}}
function renderProducts(){
 const rows=$("productsRows");
 rows.innerHTML=productCache.map(p=>{
   const price=(p.price_cents/100).toFixed(2);
   if(currentUser.role==="admin"){
     return `<tr>
       <td><input aria-label="Product name" id="name-${p.id}" value="${esc(p.name)}"></td>
       <td><input aria-label="Category" id="category-${p.id}" value="${esc(p.category)}"></td>
       <td><input aria-label="Price" id="price-${p.id}" type="number" min="0" step=".01" value="${price}"></td>
       <td><input aria-label="Stock" id="stock-${p.id}" type="number" min="0" step="1" value="${p.stock}"></td>
       <td>${p.stock>0?"In stock":"Out of stock"}</td>
       <td><button class="save-row" onclick="saveProduct('${p.id}')">Save</button> <button class="delete-row" onclick="deleteProduct('${p.id}')">Remove</button></td>
     </tr>`;
   }
   return `<tr>
     <td><b>${esc(p.name)}</b><br><small>${esc(p.sku||p.id.slice(0,8))}</small></td>
     <td>${esc(p.category)}</td>
     <td><input aria-label="Price" id="price-${p.id}" type="number" min="0" step=".01" value="${price}"></td>
     <td><input aria-label="Stock" id="stock-${p.id}" type="number" min="0" step="1" value="${p.stock}"></td>
     <td>${p.stock>0?"In stock":"Out of stock"}</td>
     <td><button class="save-row" onclick="saveProduct('${p.id}')">Save</button></td>
   </tr>`;
 }).join("")||'<tr><td colspan="6">No products yet. Add the first product.</td></tr>';
}
window.saveProduct=async id=>{
 const price=Number($("price-"+id).value),stock=Number($("stock-"+id).value);
 if(!Number.isFinite(price)||price<0||!Number.isInteger(stock)||stock<0){toast("Enter a valid price and whole stock quantity");return}
 const payload={id,price_cents:Math.round(price*100),stock};
 if(currentUser.role==="admin"){
   payload.name=$("name-"+id).value.trim();
   payload.category=$("category-"+id).value.trim();
   if(!payload.name||!payload.category){toast("Product name and category are required");return}
 }
 try{await api("/api/products",{method:"PATCH",body:JSON.stringify(payload)});toast("Product details updated");loadProducts()}catch(e){toast(e.message)}
};
window.deleteProduct=async id=>{
 if(!confirm("Remove this product from the online catalogue?"))return;
 try{await api("/api/products?id="+encodeURIComponent(id),{method:"DELETE",body:"{}"});toast("Product removed from catalogue");loadProducts()}catch(e){toast(e.message)}
};
async function loadOrders(){try{const d=await api("/api/orders");const list=d.orders||[];$("ordersContent").innerHTML=list.length?list.map(o=>`<article class="order-card"><strong>${esc(o.order_number)} · ${esc(o.customer_name)}</strong><p>${esc(o.customer_email)} · ${esc(o.customer_phone)}<br>${o.fulfilment==="delivery"?"Delivery":"Collection"} · ${esc(o.status)} · Payment: ${esc(o.payment_status)}<br>Total: €${(o.subtotal_cents/100).toFixed(2)} · ${esc(o.created_at)}</p></article>`).join(""):"No orders have been received yet."}catch(e){$("ordersContent").textContent=e.message}}
$("refreshOrders").onclick=loadOrders;
$("staffForm").addEventListener("submit",async e=>{e.preventDefault();try{await api("/api/users",{method:"POST",body:JSON.stringify({displayName:$("staffDisplay").value,username:$("staffUsername").value,password:$("staffPassword").value,role:$("staffRole").value})});toast("Staff account created");$("staffForm").reset()}catch(err){toast(err.message)}});
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
checkSession();
