// === 全局变量 === 
let currentLanguage = 'zh';
let neuralCanvas, neuralCtx;
let animationId;
let nodes = [];
let connections = [];
let mousePos = { x: 0, y: 0 };
let scrollProgress = 0;

// === 语言切换功能 ===
function toggleLanguage() {
    currentLanguage = currentLanguage === 'zh' ? 'en' : 'zh';
    updateLanguage();
    updateLanguageButton();
}

function updateLanguage() {
    const elements = document.querySelectorAll('[data-zh][data-en]');
    elements.forEach(element => {
        const text = currentLanguage === 'zh' ? element.getAttribute('data-zh') : element.getAttribute('data-en');
        if (text) {
            element.textContent = text;
        }
    });
}

function updateLanguageButton() {
    const langText = document.getElementById('lang-text');
    langText.textContent = currentLanguage === 'zh' ? 'EN' : '中';
}

// === 神经网络动画系统 ===
class NetworkNode {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.originalX = x;
        this.originalY = y;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.radius = Math.random() * 3 + 2;
        this.opacity = Math.random() * 0.5 + 0.5;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.connections = [];
        this.energy = Math.random();
        this.maxRadius = this.radius * 2;
        this.minRadius = this.radius * 0.5;
    }

    update() {
        // 添加轻微的漂浮运动
        this.x += this.vx;
        this.y += this.vy;
        
        // 边界检测
        if (this.x <= 0 || this.x >= neuralCanvas.width) this.vx *= -1;
        if (this.y <= 0 || this.y >= neuralCanvas.height) this.vy *= -1;
        
        // 脉冲效果
        this.pulsePhase += 0.02;
        this.energy = Math.sin(this.pulsePhase) * 0.3 + 0.7;
        this.radius = this.minRadius + (this.maxRadius - this.minRadius) * this.energy;
        
        // 鼠标交互
        const mouseDistance = Math.sqrt(
            Math.pow(this.x - mousePos.x, 2) + Math.pow(this.y - mousePos.y, 2)
        );
        
        if (mouseDistance < 100) {
            const force = (100 - mouseDistance) / 100;
            const angle = Math.atan2(this.y - mousePos.y, this.x - mousePos.x);
            this.x += Math.cos(angle) * force * 2;
            this.y += Math.sin(angle) * force * 2;
            this.energy = Math.min(1, this.energy + force * 0.5);
        }
        
        // 约束到原始位置附近
        const distanceFromOrigin = Math.sqrt(
            Math.pow(this.x - this.originalX, 2) + Math.pow(this.y - this.originalY, 2)
        );
        
        if (distanceFromOrigin > 50) {
            const returnForce = 0.02;
            const angle = Math.atan2(this.originalY - this.y, this.originalX - this.x);
            this.vx += Math.cos(angle) * returnForce;
            this.vy += Math.sin(angle) * returnForce;
        }
        
        // 速度衰减
        this.vx *= 0.98;
        this.vy *= 0.98;
    }

    draw() {
        neuralCtx.save();
        
        // 外层光晕
        const gradient = neuralCtx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.radius * 3
        );
        gradient.addColorStop(0, `rgba(99, 102, 241, ${this.energy * 0.3})`);
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
        
        neuralCtx.fillStyle = gradient;
        neuralCtx.beginPath();
        neuralCtx.arc(this.x, this.y, this.radius * 3, 0, Math.PI * 2);
        neuralCtx.fill();
        
        // 主节点
        neuralCtx.fillStyle = `rgba(99, 102, 241, ${this.energy * 0.8})`;
        neuralCtx.beginPath();
        neuralCtx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        neuralCtx.fill();
        
        // 内核高光
        neuralCtx.fillStyle = `rgba(255, 255, 255, ${this.energy * 0.6})`;
        neuralCtx.beginPath();
        neuralCtx.arc(this.x - this.radius * 0.3, this.y - this.radius * 0.3, this.radius * 0.3, 0, Math.PI * 2);
        neuralCtx.fill();
        
        neuralCtx.restore();
    }
}

class NetworkConnection {
    constructor(nodeA, nodeB) {
        this.nodeA = nodeA;
        this.nodeB = nodeB;
        this.strength = Math.random() * 0.5 + 0.3;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.pulseSpeed = Math.random() * 0.05 + 0.02;
        this.dataPackets = [];
        this.lastPacketTime = 0;
    }

    update() {
        this.pulsePhase += this.pulseSpeed;
        
        // 根据节点能量调整连接强度
        const avgEnergy = (this.nodeA.energy + this.nodeB.energy) / 2;
        this.strength = avgEnergy * 0.6;
        
        // 创建数据包
        if (Date.now() - this.lastPacketTime > 2000 + Math.random() * 3000) {
            this.dataPackets.push({
                progress: 0,
                speed: 0.01 + Math.random() * 0.02,
                size: Math.random() * 3 + 2,
                opacity: 1
            });
            this.lastPacketTime = Date.now();
        }
        
        // 更新数据包
        this.dataPackets = this.dataPackets.filter(packet => {
            packet.progress += packet.speed;
            if (packet.progress > 0.8) {
                packet.opacity -= 0.05;
            }
            return packet.progress < 1 && packet.opacity > 0;
        });
    }

    draw() {
        const distance = Math.sqrt(
            Math.pow(this.nodeB.x - this.nodeA.x, 2) + 
            Math.pow(this.nodeB.y - this.nodeA.y, 2)
        );
        
        if (distance > 150) return; // 不绘制过长的连接
        
        neuralCtx.save();
        
        // 主连接线
        const pulse = Math.sin(this.pulsePhase) * 0.3 + 0.7;
        const opacity = this.strength * pulse * (1 - distance / 200);
        
        neuralCtx.strokeStyle = `rgba(139, 92, 246, ${opacity * 0.6})`;
        neuralCtx.lineWidth = 1 + this.strength * 2;
        neuralCtx.beginPath();
        neuralCtx.moveTo(this.nodeA.x, this.nodeA.y);
        neuralCtx.lineTo(this.nodeB.x, this.nodeB.y);
        neuralCtx.stroke();
        
        // 数据包
        this.dataPackets.forEach(packet => {
            const x = this.nodeA.x + (this.nodeB.x - this.nodeA.x) * packet.progress;
            const y = this.nodeA.y + (this.nodeB.y - this.nodeA.y) * packet.progress;
            
            neuralCtx.fillStyle = `rgba(255, 255, 255, ${packet.opacity * 0.9})`;
            neuralCtx.beginPath();
            neuralCtx.arc(x, y, packet.size, 0, Math.PI * 2);
            neuralCtx.fill();
            
            // 数据包光晕
            const gradient = neuralCtx.createRadialGradient(x, y, 0, x, y, packet.size * 3);
            gradient.addColorStop(0, `rgba(139, 92, 246, ${packet.opacity * 0.3})`);
            gradient.addColorStop(1, 'rgba(139, 92, 246, 0)');
            neuralCtx.fillStyle = gradient;
            neuralCtx.beginPath();
            neuralCtx.arc(x, y, packet.size * 3, 0, Math.PI * 2);
            neuralCtx.fill();
        });
        
        neuralCtx.restore();
    }
}

function initNeuralNetwork() {
    neuralCanvas = document.getElementById('neuralCanvas');
    if (!neuralCanvas) return;
    
    neuralCtx = neuralCanvas.getContext('2d');
    
    // 设置画布尺寸
    function resizeCanvas() {
        const rect = neuralCanvas.getBoundingClientRect();
        neuralCanvas.width = rect.width;
        neuralCanvas.height = rect.height;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // 创建节点
    nodes = [];
    const nodeCount = 25;
    
    for (let i = 0; i < nodeCount; i++) {
        const x = Math.random() * neuralCanvas.width;
        const y = Math.random() * neuralCanvas.height;
        nodes.push(new NetworkNode(x, y));
    }
    
    // 创建连接
    connections = [];
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const distance = Math.sqrt(
                Math.pow(nodes[j].x - nodes[i].x, 2) + 
                Math.pow(nodes[j].y - nodes[i].y, 2)
            );
            
            if (distance < 120 && Math.random() < 0.4) {
                connections.push(new NetworkConnection(nodes[i], nodes[j]));
            }
        }
    }
    
    // 鼠标跟踪
    neuralCanvas.addEventListener('mousemove', (e) => {
        const rect = neuralCanvas.getBoundingClientRect();
        mousePos.x = e.clientX - rect.left;
        mousePos.y = e.clientY - rect.top;
    });
    
    neuralCanvas.addEventListener('mouseleave', () => {
        mousePos.x = -1000;
        mousePos.y = -1000;
    });
    
    // 开始动画
    animateNeuralNetwork();
}

function animateNeuralNetwork() {
    if (!neuralCtx) return;
    
    // 清除画布
    neuralCtx.clearRect(0, 0, neuralCanvas.width, neuralCanvas.height);
    
    // 背景渐变
    const gradient = neuralCtx.createLinearGradient(0, 0, neuralCanvas.width, neuralCanvas.height);
    gradient.addColorStop(0, 'rgba(248, 250, 252, 0.8)');
    gradient.addColorStop(1, 'rgba(243, 244, 246, 0.9)');
    neuralCtx.fillStyle = gradient;
    neuralCtx.fillRect(0, 0, neuralCanvas.width, neuralCanvas.height);
    
    // 更新和绘制连接
    connections.forEach(connection => {
        connection.update();
        connection.draw();
    });
    
    // 更新和绘制节点
    nodes.forEach(node => {
        node.update();
        node.draw();
    });
    
    // 添加机械手效果（当鼠标在画布内时）
    if (mousePos.x > 0 && mousePos.y > 0 && mousePos.x < neuralCanvas.width && mousePos.y < neuralCanvas.height) {
        drawRoboticHand();
    }
    
    animationId = requestAnimationFrame(animateNeuralNetwork);
}

function drawRoboticHand() {
    neuralCtx.save();
    
    // 机械手的基本形状
    const handSize = 40;
    const x = mousePos.x;
    const y = mousePos.y;
    
    // 手掌
    neuralCtx.fillStyle = 'rgba(99, 102, 241, 0.7)';
    neuralCtx.strokeStyle = 'rgba(79, 70, 229, 0.9)';
    neuralCtx.lineWidth = 2;
    
    neuralCtx.beginPath();
    neuralCtx.roundRect(x - handSize/2, y - handSize/3, handSize, handSize * 2/3, 5);
    neuralCtx.fill();
    neuralCtx.stroke();
    
    // 手指
    for (let i = 0; i < 4; i++) {
        const fingerX = x - handSize/2 + (i + 1) * handSize/5;
        const fingerY = y - handSize/3;
        
        neuralCtx.beginPath();
        neuralCtx.roundRect(fingerX - 3, fingerY - 15, 6, 15, 3);
        neuralCtx.fill();
        neuralCtx.stroke();
        
        // 关节线
        neuralCtx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        neuralCtx.lineWidth = 1;
        neuralCtx.beginPath();
        neuralCtx.moveTo(fingerX - 2, fingerY - 5);
        neuralCtx.lineTo(fingerX + 2, fingerY - 5);
        neuralCtx.moveTo(fingerX - 2, fingerY - 10);
        neuralCtx.lineTo(fingerX + 2, fingerY - 10);
        neuralCtx.stroke();
    }
    
    // 拇指
    neuralCtx.fillStyle = 'rgba(99, 102, 241, 0.7)';
    neuralCtx.strokeStyle = 'rgba(79, 70, 229, 0.9)';
    neuralCtx.lineWidth = 2;
    
    neuralCtx.beginPath();
    neuralCtx.roundRect(x - handSize/2 - 8, y - 5, 12, 8, 3);
    neuralCtx.fill();
    neuralCtx.stroke();
    
    // 能量连接线到最近的节点
    let closestNode = null;
    let closestDistance = Infinity;
    
    nodes.forEach(node => {
        const distance = Math.sqrt(Math.pow(node.x - x, 2) + Math.pow(node.y - y, 2));
        if (distance < closestDistance && distance < 80) {
            closestDistance = distance;
            closestNode = node;
        }
    });
    
    if (closestNode) {
        neuralCtx.strokeStyle = `rgba(168, 85, 247, ${1 - closestDistance / 80})`;
        neuralCtx.lineWidth = 3;
        neuralCtx.setLineDash([5, 5]);
        neuralCtx.beginPath();
        neuralCtx.moveTo(x, y);
        neuralCtx.lineTo(closestNode.x, closestNode.y);
        neuralCtx.stroke();
        neuralCtx.setLineDash([]);
        
        // 增强被触摸节点的能量
        closestNode.energy = Math.min(1, closestNode.energy + 0.1);
    }
    
    neuralCtx.restore();
}

// === 滚动效果 ===
function initScrollEffects() {
    window.addEventListener('scroll', () => {
        scrollProgress = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
        
        // 导航栏背景透明度
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
            navbar.style.backdropFilter = 'blur(20px)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.8)';
            navbar.style.backdropFilter = 'blur(20px)';
        }
        
        // 神经网络画布清晰度效果
        if (neuralCanvas) {
            const heroSection = document.querySelector('.hero-section');
            const heroRect = heroSection.getBoundingClientRect();
            const visibility = Math.max(0, Math.min(1, (window.innerHeight - Math.abs(heroRect.top)) / window.innerHeight));
            
            neuralCanvas.style.filter = `blur(${(1 - visibility) * 5}px) opacity(${0.3 + visibility * 0.7})`;
        }
        
        // 视差效果
        const blobs = document.querySelectorAll('.blob');
        blobs.forEach((blob, index) => {
            const speed = 0.5 + index * 0.1;
            blob.style.transform = `translateY(${scrollProgress * 100 * speed}px)`;
        });
    });
}

// === 交互动画 ===
function initInteractionAnimations() {
    // 卡片悬停效果
    const cards = document.querySelectorAll('.floating-card, .business-card, .job-card, .benefit-item');
    
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-8px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0) scale(1)';
        });
    });
    
    // 按钮点击波纹效果
    const buttons = document.querySelectorAll('.cta-button, .contact-button');
    
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                transform: scale(0);
                animation: ripple 0.6s ease-out;
                pointer-events: none;
            `;
            
            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
    
    // CSS 动画定义
    const style = document.createElement('style');
    style.textContent = `
        @keyframes ripple {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// === 滚动到指定区域 ===
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// === 联系按钮功能 ===
function initContactButton() {
    const contactButton = document.querySelector('.contact-button');
    if (contactButton) {
        contactButton.addEventListener('click', () => {
            window.location.href = 'mailto:join@singularityx.tech?subject=求职咨询&body=您好，我对贵公司的职位很感兴趣...';
        });
    }
    
    // CTA 按钮功能
    const ctaButtons = document.querySelectorAll('.cta-button');
    ctaButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const text = button.textContent.trim();
            if (text === '了解更多' || text === 'Learn More') {
                scrollToSection('about');
            } else if (text === '加入我们' || text === 'Join Us') {
                scrollToSection('careers');
            }
        });
    });
}

// === 性能优化 ===
function initPerformanceOptimizations() {
    // 节流滚动事件
    let scrollTimer;
    const originalScrollHandler = window.onscroll;
    
    window.addEventListener('scroll', () => {
        if (scrollTimer) {
            clearTimeout(scrollTimer);
        }
        scrollTimer = setTimeout(() => {
            // 滚动事件处理
        }, 16); // 约60fps
    });
    
    // 当页面不可见时暂停动画
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
        } else {
            animateNeuralNetwork();
        }
    });
}

// === 初始化 ===
document.addEventListener('DOMContentLoaded', () => {
    // 初始化各个系统
    initNeuralNetwork();
    initScrollEffects();
    initInteractionAnimations();
    initContactButton();
    initPerformanceOptimizations();
    
    // 设置初始语言
    updateLanguage();
    updateLanguageButton();
    
    // 平滑加载动画
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease';
    
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
    
    // 导航链接点击处理
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const href = link.getAttribute('href');
            if (href.startsWith('#')) {
                scrollToSection(href.substring(1));
            }
        });
    });
});

// === 工具函数 ===
// 添加 roundRect 方法支持（用于旧版浏览器）
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
        this.beginPath();
        this.moveTo(x + radius, y);
        this.lineTo(x + width - radius, y);
        this.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.lineTo(x + width, y + height - radius);
        this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.lineTo(x + radius, y + height);
        this.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.lineTo(x, y + radius);
        this.quadraticCurveTo(x, y, x + radius, y);
        this.closePath();
    };
}