import React, { useState, useEffect } from 'react';
import { Card } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import styles from './home.module.scss';
import campus1 from '@/assets/images/OIP-C.we.jpg';
import campus2 from '@/assets/images/OIP-C.web.jpg';
import campus3 from '@/assets/images/OIP-C.jpg';

const HomePage: React.FC = () => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const images = [
        { src: campus1, title: '校园风光' },
        { src: campus2, title: '黄昏校门' },
        { src: campus3, title: '校园一角' },
    ];

    // 获取图片索引（循环）
    const getImageIndex = (offset: number) => {
        return (currentIndex + offset + images.length) % images.length;
    };

    // 自动轮播
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % images.length);
        }, 4000);
        return () => clearInterval(interval);
    }, [images.length]);

    const goToPrev = () => {
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    const goToNext = () => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
    };

    return (
        <div>
            {/* 三图轮播画廊 */}
            <div className={styles.carouselContainer}>
                {/* 左侧按钮 */}
                <button className={styles.navButton} onClick={goToPrev}>
                    <LeftOutlined />
                </button>

                {/* 图片容器 */}
                <div className={styles.carouselImages}>
                    {/* 左图 */}
                    <div className={styles.carouselItemLeft}>
                        <img
                            src={images[getImageIndex(-1)].src}
                            alt={images[getImageIndex(-1)].title}
                            className={styles.carouselImg}
                        />
                    </div>

                    {/* 中图（主图） */}
                    <div className={styles.carouselItemCenter}>
                        <img
                            src={images[currentIndex].src}
                            alt={images[currentIndex].title}
                            className={styles.carouselImgCenter}
                        />
                        <div className={styles.carouselTitle}>{images[currentIndex].title}</div>
                    </div>

                    {/* 右图 */}
                    <div className={styles.carouselItemRight}>
                        <img
                            src={images[getImageIndex(1)].src}
                            alt={images[getImageIndex(1)].title}
                            className={styles.carouselImg}
                        />
                    </div>
                </div>

                {/* 右侧按钮 */}
                <button className={styles.navButton} onClick={goToNext}>
                    <RightOutlined />
                </button>

                {/* 指示器 */}
                <div className={styles.dots}>
                    {images.map((_, index) => (
                        <button
                            key={index}
                            className={`${styles.dot} ${currentIndex === index ? styles.active : ''}`}
                            onClick={() => setCurrentIndex(index)}
                        />
                    ))}
                </div>
            </div>

            <Card className={styles.functionCard}>
                <h2 className={styles.functionTitle}>系统功能说明</h2>

                <div className={styles.functionItem}>
                    <h3>1. 数据可视化</h3>
                    <ul>
                        <li>展示系统关键数据的图表分析</li>
                        <li>提供直观的数据趋势和统计信息</li>
                    </ul>
                </div>

                <div className={styles.functionItem}>
                    <h3>2. 账号管理</h3>
                    <ul>
                        <li>账号列表：查看和管理所有用户账号</li>
                        <li>添加账号：创建新的系统用户账号</li>
                        <li>重置密码：为忘记密码的用户重置登录凭证</li>
                    </ul>
                </div>

                <div className={styles.functionItem}>
                    <h3>3. 审批申请</h3>
                    <ul>
                        <li>提交各类审批申请</li>
                        <li>查看申请处理状态</li>
                        <li>审批流程：管理员审核并处理申请</li>
                    </ul>
                </div>

                <div className={styles.functionItem}>
                    <h3>4. 查询统计</h3>
                    <ul>
                        <li>入校记录：查询所有入校登记信息</li>
                        <li>数据报表：生成各类统计报表</li>
                    </ul>
                </div>

                <div className={styles.functionItem}>
                    <h3>5. 系统设置</h3>
                    <ul>
                        <li>基础设置：配置系统基础参数</li>
                        <li>安全设置：管理账号安全和权限</li>
                    </ul>
                </div>
            </Card>
        </div>
    );
};

export default HomePage;
