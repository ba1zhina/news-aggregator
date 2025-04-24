document.addEventListener('DOMContentLoaded', () => {
    const newsList = document.getElementById('newsList');
    const modal = document.getElementById('newsModal');
    const closeBtn = document.querySelector('.close');
    const toneButtons = document.querySelectorAll('.tone-btn');
    const categoryFilters = document.querySelector('.category-filters');
    const header = document.querySelector('header');
    const mainTitle = document.querySelector('.main-title');
    const filters = document.querySelector('.filters');

    let selectedTones = new Set();
    let selectedCategories = new Set();
    let allNews = [];

    // Show filters with animation
    setTimeout(() => {
        filters.classList.add('visible');
    }, 500);

    // Load categories
    fetch('/api/categories')
        .then(response => response.json())
        .then(categories => {
            categories.forEach(category => {
                const button = document.createElement('button');
                button.className = 'category-btn';
                button.textContent = category;
                button.dataset.category = category;
                button.addEventListener('click', () => toggleCategory(category));
                categoryFilters.appendChild(button);
            });
        });

    // Toggle tone filter
    toneButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tone = button.dataset.tone;
            button.classList.toggle('active');
            if (button.classList.contains('active')) {
                selectedTones.add(tone);
            } else {
                selectedTones.delete(tone);
            }
            checkFilters();
        });
    });

    // Toggle category filter
    function toggleCategory(category) {
        const button = document.querySelector(`[data-category="${category}"]`);
        button.classList.toggle('active');
        if (button.classList.contains('active')) {
            selectedCategories.add(category);
        } else {
            selectedCategories.delete(category);
        }
        checkFilters();
    }

    function checkFilters() {
        if (selectedTones.size > 0 || selectedCategories.size > 0) {
            // Collapse header
            header.classList.add('header-collapsed');
            // Show news list
            newsList.classList.add('visible');
            // Load news
            loadNews();
        } else {
            // Expand header
            header.classList.remove('header-collapsed');
            // Hide news list
            newsList.classList.remove('visible');
        }
    }

    // Load news
    function loadNews() {
        const params = new URLSearchParams();
        if (selectedTones.size > 0) {
            params.append('tones', Array.from(selectedTones).join(','));
        }
        if (selectedCategories.size > 0) {
            params.append('categories', Array.from(selectedCategories).join(','));
        }

        fetch(`/api/news?${params.toString()}`)
            .then(response => response.json())
            .then(news => {
                allNews = news;
                renderNews();
            });
    }

    // Render news items
    function renderNews() {
        newsList.innerHTML = '';
        allNews.forEach(news => {
            const item = document.createElement('div');
            item.className = 'news-item';
            item.innerHTML = `
                <h2>${news.title}</h2>
                <div class="meta">
                    <span class="category">${news.category}</span>
                    <span class="tone ${news.tone}">${getToneText(news.tone)}</span>
                    <span class="date">${formatDate(news.date)}</span>
                </div>
            `;
            item.addEventListener('click', () => showModal(news));
            newsList.appendChild(item);
        });
    }

    // Show modal with news details
    function showModal(news) {
        document.getElementById('modalTitle').textContent = news.title;
        document.getElementById('modalText').textContent = news.text;
        document.getElementById('modalCategory').textContent = news.category;
        document.getElementById('modalTone').textContent = getToneText(news.tone);
        document.getElementById('modalDate').textContent = formatDate(news.date);
        document.getElementById('modalUrl').href = news.url;
        modal.style.display = 'block';
        setTimeout(() => {
            modal.classList.add('visible');
        }, 10);
    }

    // Close modal
    closeBtn.addEventListener('click', () => {
        modal.classList.remove('visible');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 800);
    });

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.classList.remove('visible');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 800);
        }
    });

    // Helper functions
    function getToneText(tone) {
        const toneMap = {
            positive: 'Позитивная',
            neutral: 'Нейтральная',
            negative: 'Негативная'
        };
        return toneMap[tone] || tone;
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}); 