import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Highlight from './Highlight';

describe('Highlight', () => {
  it('wraps a single case-insensitive match in a <mark>', () => {
    const { container } = render(<Highlight text="Deep Learning Survey" query="learning" />);
    const marks = container.querySelectorAll('mark');
    expect(marks).toHaveLength(1);
    expect(marks[0].textContent).toBe('Learning');
    expect(container.textContent).toBe('Deep Learning Survey');
  });

  it('wraps every occurrence, not just the first', () => {
    const { container } = render(<Highlight text="cat scan of a cat" query="cat" />);
    expect(container.querySelectorAll('mark')).toHaveLength(2);
  });

  it('renders the text unchanged when there is no match', () => {
    const { container } = render(<Highlight text="Deep Learning Survey" query="quantum" />);
    expect(container.querySelectorAll('mark')).toHaveLength(0);
    expect(container.textContent).toBe('Deep Learning Survey');
  });

  it('renders the text unchanged for an empty/whitespace query', () => {
    const { container } = render(<Highlight text="Deep Learning Survey" query="   " />);
    expect(container.querySelectorAll('mark')).toHaveLength(0);
  });

  it('does not crash on a query containing regex special characters', () => {
    const { container } = render(<Highlight text="C++ (a language)" query="c++ (a" />);
    expect(container.textContent).toBe('C++ (a language)');
    expect(container.querySelectorAll('mark')).toHaveLength(1);
  });
});
