// protect.js to restrict access to authenticated users only for frontend pages

(function(){
    const token=localStorage.getItem('authToken');
    if(!token){
        window.location.href='/login.html';
    }
})();