import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ArticleCard } from '../ArticleCard';
import type { Article } from '../../types';

const ARTICLE: Article = {
  id: '1',
  source: 'guardian',
  sourceLabel: 'The Guardian',
  title: 'Breaking news headline',
  description: 'A short description of the article.',
  url: 'https://theguardian.com/article',
  imageUrl: 'https://theguardian.com/image.jpg',
  author: 'Jane Reporter',
  category: 'World news',
  publishedAt: '2026-03-15T00:00:00Z',
};

describe('ArticleCard', () => {
  it('renders the title, source, author, and category', () => {
    render(<ArticleCard article={ARTICLE} />);
    expect(screen.getByText('Breaking news headline')).toBeInTheDocument();
    expect(screen.getByText('The Guardian')).toBeInTheDocument();
    expect(screen.getByText('Jane Reporter')).toBeInTheDocument();
    expect(screen.getByText('World news')).toBeInTheDocument();
  });

  it('links out to the original article in a new tab', () => {
    render(<ArticleCard article={ARTICLE} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://theguardian.com/article');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  it('omits the description and category when not provided', () => {
    render(<ArticleCard article={{ ...ARTICLE, description: null, category: null }} />);
    expect(screen.queryByText('A short description of the article.')).not.toBeInTheDocument();
    expect(screen.queryByText('World news')).not.toBeInTheDocument();
  });
});
