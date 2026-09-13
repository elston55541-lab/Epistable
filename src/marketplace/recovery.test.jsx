import { it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordRecovery } from './PasswordRecovery';

it('does not expose password update without a validated session',async()=>{
  const auth={getUser:vi.fn().mockResolvedValue({data:{user:null},error:new Error('Expired')}),updateUser:vi.fn()};
  render(<PasswordRecovery reset auth={auth}/>);
  expect(await screen.findByRole('alert')).toHaveProperty('textContent','This reset link is invalid or expired. Request a new link below.');
  expect(screen.queryByLabelText('New password *')).toBeNull();expect(auth.updateUser).not.toHaveBeenCalled();
});
it('requests recovery with the app callback and a neutral success message',async()=>{
  const auth={resetPasswordForEmail:vi.fn().mockResolvedValue({error:null})};
  render(<PasswordRecovery auth={auth}/>);const user=userEvent.setup();
  await user.type(screen.getByLabelText('Email *'),'Owner@example.invalid');
  await user.click(screen.getByRole('button',{name:'Send reset link'}));
  expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('owner@example.invalid',{redirectTo:window.location.origin+'/reset-password'});
  expect(await screen.findByRole('status')).toHaveProperty('textContent',expect.stringContaining('If this email has an account'));
});
it('validates confirmation and retains the form when Supabase rejects a password',async()=>{
  const auth={getUser:vi.fn().mockResolvedValue({data:{user:{id:'test'}}}),updateUser:vi.fn().mockResolvedValue({error:new Error('Password does not meet requirements')})};
  render(<PasswordRecovery reset auth={auth}/>);const user=userEvent.setup();
  await user.type(await screen.findByLabelText('New password *'),'test-only-password');
  await user.type(screen.getByLabelText('Confirm password *'),'different-password');
  await user.click(screen.getByRole('button',{name:'Save new password'}));
  expect(auth.updateUser).not.toHaveBeenCalled();expect(screen.getByRole('alert').textContent).toBe('Passwords do not match.');
  await user.clear(screen.getByLabelText('Confirm password *'));await user.type(screen.getByLabelText('Confirm password *'),'test-only-password');
  await user.click(screen.getByRole('button',{name:'Save new password'}));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent','Password does not meet requirements');
  expect(screen.getByRole('button',{name:'Save new password'})).toBeTruthy();
});
