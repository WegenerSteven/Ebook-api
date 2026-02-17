import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../entities/user.entity';
import { Category } from '../entities/category.entity';
import { Book } from '../entities/book.entity';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { CartItem } from '../entities/cart-item.entity';
import { Review } from '../entities/review.entity';
import { Payment } from 'src/entities';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || '@40300912',
  database: process.env.DB_NAME || 'ebook_db',
  entities: [User, Category, Book, Order, OrderItem, CartItem, Review, Payment],
  synchronize: true,
});

async function seed() {
  try {
    await dataSource.initialize();
    console.log('Database connected');

    const userRepo = dataSource.getRepository(User);
    const categoryRepo = dataSource.getRepository(Category);
    const bookRepo = dataSource.getRepository(Book);

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = userRepo.create({
      fullname: 'Admin User',
      email: 'admin@ebook.com',
      password: adminPassword,
      role: UserRole.ADMIN,
    });
    await userRepo.save(admin);
    console.log('Admin user created');

    // Create seller user
    const sellerPassword = await bcrypt.hash('seller123', 10);
    const seller = userRepo.create({
      fullname: 'Sarah J. Dev',
      email: 'seller@ebook.com',
      password: sellerPassword,
      role: UserRole.SELLER,
    });
    await userRepo.save(seller);
    console.log('Seller user created');

    // Create test user
    const userPassword = await bcrypt.hash('user123', 10);
    const testUser = userRepo.create({
      fullname: 'John Doe',
      email: 'user@ebook.com',
      password: userPassword,
      role: UserRole.USER,
    });
    await userRepo.save(testUser);
    console.log('Test user created');

    // Create categories
    const categories = [
      {
        name: 'Technology',
        slug: 'technology',
        description: 'Books about technology and software development',
      },
      {
        name: 'Business',
        slug: 'business',
        description: 'Business, entrepreneurship, and finance books',
      },
      {
        name: 'Science Fiction',
        slug: 'science-fiction',
        description: 'Sci-fi novels and stories',
      },
      {
        name: 'Self-Help',
        slug: 'self-help',
        description: 'Personal development and self-improvement',
      },
      {
        name: 'Fiction',
        slug: 'fiction',
        description: 'Fictional novels and stories',
      },
      {
        name: 'Non-Fiction',
        slug: 'non-fiction',
        description: 'True stories and factual books',
      },
      {
        name: 'Cooking',
        slug: 'cooking',
        description: 'Culinary arts and recipes',
      },
      {
        name: 'Travel',
        slug: 'travel',
        description: 'Travel guides and adventure stories',
      },
    ];

    const savedCategories: Category[] = [];
    for (const cat of categories) {
      const category = categoryRepo.create(cat);
      const saved = await categoryRepo.save(category);
      savedCategories.push(saved);
    }
    console.log('Categories created');

    // Create sample books
    const books = [
      {
        title: 'The Art of Modern Code',
        subtitle: 'Mastering the Craft of Software Development',
        author: 'Sarah J. Dev',
        description:
          'Unlock the secrets of writing clean, maintainable, and efficient code in the modern era. This comprehensive guide takes you through the principles of software craftsmanship, design patterns, and best practices that every developer should know.',
        price: 29.99,
        coverUrl:
          'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&q=80&w=600',
        pages: 350,
        language: 'English',
        publisher: 'TechPress',
        publishedDate: 'Jan 2026',
        categoryId: savedCategories[0].id,
        sellerId: seller.userId,
        rating: 4.8,
        reviewCount: 124,
        isFeatured: true,
      },
      {
        title: 'Digital Nomad Life',
        subtitle: 'Work from Anywhere',
        author: 'Mike Travels',
        description:
          'Learn how to become a successful digital nomad and work from anywhere in the world. This guide covers everything from finding remote work to choosing the best destinations.',
        price: 14.99,
        coverUrl:
          'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600',
        pages: 220,
        language: 'English',
        publisher: 'Travel Books',
        publishedDate: 'Dec 2025',
        categoryId: savedCategories[7].id,
        sellerId: seller.userId,
        rating: 4.5,
        reviewCount: 89,
        isFeatured: true,
      },
      {
        title: 'Future of AI',
        subtitle: 'Understanding Artificial Intelligence',
        author: 'Dr. Alan Turing Jr.',
        description:
          'An in-depth exploration of artificial intelligence, machine learning, and their impact on society. From neural networks to ethical considerations.',
        price: 34.5,
        coverUrl:
          'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=600',
        pages: 450,
        language: 'English',
        publisher: 'AI Press',
        publishedDate: 'Nov 2025',
        categoryId: savedCategories[0].id,
        sellerId: seller.userId,
        rating: 4.9,
        reviewCount: 256,
        isFeatured: true,
      },
      {
        title: 'Culinary Secrets',
        subtitle: 'Master Chef Techniques',
        author: 'Chef Gordon',
        description:
          'Discover the secrets of professional chefs and elevate your cooking skills to the next level. From basic techniques to advanced recipes.',
        price: 24.99,
        coverUrl:
          'https://images.unsplash.com/photo-1466637574441-749b8f19452f?auto=format&fit=crop&q=80&w=600',
        pages: 280,
        language: 'English',
        publisher: 'Food Press',
        publishedDate: 'Oct 2025',
        categoryId: savedCategories[6].id,
        sellerId: seller.userId,
        rating: 4.7,
        reviewCount: 178,
        isFeatured: false,
      },
      {
        title: 'Startup Success',
        subtitle: 'Build Your Dream Business',
        author: 'Emma Entrepreneur',
        description:
          'A complete guide to launching and growing a successful startup. Learn from real-world examples and proven strategies.',
        price: 19.99,
        coverUrl:
          'https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&q=80&w=600',
        pages: 320,
        language: 'English',
        publisher: 'Business Books',
        publishedDate: 'Sep 2025',
        categoryId: savedCategories[1].id,
        sellerId: seller.userId,
        rating: 4.6,
        reviewCount: 145,
        isFeatured: true,
      },
      {
        title: 'The Mind Garden',
        subtitle: 'Cultivating Mental Wellness',
        author: 'Dr. Peace Mind',
        description:
          'A practical guide to mindfulness, meditation, and mental well-being. Learn techniques to reduce stress and improve your quality of life.',
        price: 16.99,
        coverUrl:
          'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=600',
        pages: 200,
        language: 'English',
        publisher: 'Wellness Press',
        publishedDate: 'Aug 2025',
        categoryId: savedCategories[3].id,
        sellerId: seller.userId,
        rating: 4.8,
        reviewCount: 312,
        isFeatured: true,
      },
    ];

    for (const bookData of books) {
      const book = bookRepo.create(bookData);
      await bookRepo.save(book);
    }
    console.log('Sample books created');

    console.log('\n✅ Database seeded successfully!');
    console.log('\nTest Accounts:');
    console.log('Admin: admin@ebook.com / admin123');
    console.log('Seller: seller@ebook.com / seller123');
    console.log('User: user@ebook.com / user123');

    await dataSource.destroy();
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();
