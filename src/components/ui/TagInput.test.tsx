import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { TagInput } from './TagInput';

function Harness({ initial = [] as string[] }): JSX.Element {
  const [tags, setTags] = useState(initial);
  return (
    <>
      <TagInput tags={tags} onChange={setTags} />
      <output data-testid="value">{tags.join(',')}</output>
    </>
  );
}

describe('TagInput', () => {
  it('adds a tag on Enter, lower-cased and without the hash', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByLabelText('Add tag'), '#ELK{Enter}');
    expect(screen.getByTestId('value')).toHaveTextContent('elk');
  });

  it('refuses duplicates', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['elk']} />);
    await user.type(screen.getByLabelText('Add tag'), 'elk{Enter}');
    expect(screen.getByTestId('value')).toHaveTextContent(/^elk$/);
  });

  it('removes a tag through its remove button', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['elk', 'osint']} />);
    await user.click(screen.getByLabelText('Remove tag elk'));
    expect(screen.getByTestId('value')).toHaveTextContent(/^osint$/);
  });

  it('backspaces the last tag when the field is empty', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['a', 'b']} />);
    await user.type(screen.getByLabelText('Add tag'), '{Backspace}');
    expect(screen.getByTestId('value')).toHaveTextContent(/^a$/);
  });
});
