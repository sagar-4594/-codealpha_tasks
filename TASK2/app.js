document.addEventListener("DOMContentLoaded", function () {
    loadPosts();
});

function addPost() {
    let postText = document.getElementById("new-post").value;
    if (postText.trim() === "") {
        alert("Post cannot be empty!");
        return;
    }
    
    let postContainer = document.getElementById("post-container");
    let newPost = document.createElement("div");
    newPost.classList.add("post");
    newPost.innerHTML = `<p>${postText}</p><button onclick="likePost(this)">Like</button> <span class="like-count">0</span> Likes`;
    
    postContainer.prepend(newPost);
    document.getElementById("new-post").value = "";
    savePosts();
}

function likePost(button) {
    let likeCountSpan = button.nextElementSibling;
    let likeCount = parseInt(likeCountSpan.textContent, 10);
    likeCountSpan.textContent = likeCount + 1;
}

function followUser() {
    alert("You are now following this user!");
}

function savePosts() {
    let posts = [];
    document.querySelectorAll(".post p").forEach(post => {
        posts.push(post.textContent);
    });
    localStorage.setItem("posts", JSON.stringify(posts));
}

function loadPosts() {
    let postContainer = document.getElementById("post-container");
    let posts = JSON.parse(localStorage.getItem("posts")) || [];
    posts.forEach(postText => {
        let post = document.createElement("div");
        post.classList.add("post");
        post.innerHTML = `<p>${postText}</p><button onclick="likePost(this)">Like</button> <span class="like-count">0</span> Likes`;
        postContainer.appendChild(post);
    });
}
