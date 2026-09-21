import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SearchBar } from '../SearchBar';

describe('SearchBar', () => {
  it('renders the current value', () => {
    render(<SearchBar value="climate" onChange={() => {}} />);
    expect(screen.getByLabelText('Search articles')).toHaveValue('climate');
  });

  it('calls onChange with the new value as the user types', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SearchBar value="" onChange={onChange} />);

    await user.type(screen.getByLabelText('Search articles'), 'ai');

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenNthCalledWith(1, 'a');
    expect(onChange).toHaveBeenNthCalledWith(2, 'i');
  });
});
