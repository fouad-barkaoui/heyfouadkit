import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDelete } from './ConfirmDelete';

describe('ConfirmDelete', () => {
  it('does not fire on the first press', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<ConfirmDelete onConfirm={onConfirm} />);
    await user.click(screen.getByRole('button'));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('fires on the second press and announces the armed state', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<ConfirmDelete onConfirm={onConfirm} />);
    await user.click(screen.getByRole('button'));
    expect(screen.getByLabelText(/press again to confirm/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
