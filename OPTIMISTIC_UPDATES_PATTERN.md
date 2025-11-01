# Optimistic Updates Pattern - Quick Reference

## What is Optimistic Update?

An optimistic update is a UX pattern where the UI is updated immediately when the user performs an action, before waiting for the server/backend to confirm the change.

## Why Use It?

✅ **Instant Feedback** - Users see changes immediately
✅ **Better UX** - Feels fast and responsive
✅ **Hides Latency** - Network delays don't affect perceived speed
✅ **Modern Feel** - Matches user expectations from modern apps

## When to Use

✅ **Good for:**
- Delete operations (like our context pills)
- Like/unlike actions
- Simple toggles (on/off)
- Adding items to lists
- Marking items as read/unread

❌ **Avoid for:**
- Payment processing
- Critical data operations
- Operations that frequently fail
- Complex validations

## Basic Pattern

```typescript
const handleAction = async (id: string) => {
  try {
    // 1. Update UI immediately (optimistic)
    updateUIState(id);
    
    // 2. Sync with backend (background)
    await backendAPI.performAction(id);
    
    // 3. Success! Nothing more to do
  } catch (error) {
    // 4. Revert UI change on error
    revertUIState(id);
    showErrorMessage(error);
  }
};
```

## Our Implementation

### Context Pills Delete

```typescript
const handleDeleteContext = useCallback(async (pillId: string) => {
  try {
    // Step 1: Optimistic UI update
    onPillRemove(pillId);        // Remove from React state
    setSelectedNode(null);        // Close detail panel
    
    // Step 2: Backend sync
    await contextManager.removeItem(workspaceId, pillId);
    
    // Step 3: Success (no action needed)
  } catch (error) {
    // Step 4: Error handling
    console.error('Failed to delete context:', error);
    // TODO: Revert UI change (future improvement)
  }
}, [workspaceId, onPillRemove]);
```

## Common Patterns

### 1. Delete Item

```typescript
const deleteItem = async (id: string) => {
  // Optimistic: Remove from UI
  setItems(items => items.filter(item => item.id !== id));
  
  try {
    await api.delete(id);
  } catch (error) {
    // Revert: Add back to UI
    setItems(items => [...items, deletedItem]);
    showError('Delete failed');
  }
};
```

### 2. Toggle State

```typescript
const toggleLike = async (id: string) => {
  // Optimistic: Toggle UI
  setLiked(prev => !prev);
  
  try {
    await api.toggleLike(id);
  } catch (error) {
    // Revert: Toggle back
    setLiked(prev => !prev);
    showError('Like failed');
  }
};
```

### 3. Add Item

```typescript
const addItem = async (newItem: Item) => {
  // Optimistic: Add to UI with temp ID
  const tempId = `temp-${Date.now()}`;
  setItems(items => [...items, { ...newItem, id: tempId }]);
  
  try {
    const result = await api.create(newItem);
    // Replace temp ID with real ID
    setItems(items => 
      items.map(item => 
        item.id === tempId ? result : item
      )
    );
  } catch (error) {
    // Revert: Remove temp item
    setItems(items => items.filter(item => item.id !== tempId));
    showError('Add failed');
  }
};
```

### 4. Update Item

```typescript
const updateItem = async (id: string, changes: Partial<Item>) => {
  // Save original for revert
  const original = items.find(item => item.id === id);
  
  // Optimistic: Update UI
  setItems(items => 
    items.map(item => 
      item.id === id ? { ...item, ...changes } : item
    )
  );
  
  try {
    await api.update(id, changes);
  } catch (error) {
    // Revert: Restore original
    setItems(items => 
      items.map(item => 
        item.id === id ? original : item
      )
    );
    showError('Update failed');
  }
};
```

## Best Practices

### ✅ Do

1. **Update UI first** - Always update UI before backend call
2. **Save original state** - Keep original data for reverting
3. **Handle errors gracefully** - Revert UI changes on error
4. **Show error messages** - Let users know when something fails
5. **Use loading states** - Show subtle indicators for background operations
6. **Test error cases** - Simulate network failures to test revert logic

### ❌ Don't

1. **Don't skip error handling** - Always handle backend failures
2. **Don't forget to revert** - UI must match backend state
3. **Don't use for critical operations** - Payments, etc. need confirmation
4. **Don't ignore race conditions** - Handle concurrent operations
5. **Don't make it confusing** - Users should understand what's happening
6. **Don't overuse** - Not every operation needs optimistic updates

## Error Handling Strategies

### 1. Silent Revert (Simple)
```typescript
catch (error) {
  revertUIState();
  console.error(error);
}
```

### 2. Toast Notification (Better)
```typescript
catch (error) {
  revertUIState();
  showToast('Operation failed. Please try again.');
}
```

### 3. Inline Error (Best)
```typescript
catch (error) {
  revertUIState();
  setError(`Failed to delete: ${error.message}`);
  // Show error near the affected item
}
```

### 4. Retry Option (Advanced)
```typescript
catch (error) {
  revertUIState();
  showRetryDialog({
    message: 'Operation failed',
    onRetry: () => handleAction(id)
  });
}
```

## Testing Optimistic Updates

### 1. Test Happy Path
```typescript
test('deletes item optimistically', async () => {
  const { getByText } = render(<Component />);
  const deleteButton = getByText('Delete');
  
  fireEvent.click(deleteButton);
  
  // Item should disappear immediately
  expect(queryByText('Item')).not.toBeInTheDocument();
});
```

### 2. Test Error Path
```typescript
test('reverts on error', async () => {
  // Mock API to fail
  api.delete.mockRejectedValue(new Error('Failed'));
  
  const { getByText } = render(<Component />);
  const deleteButton = getByText('Delete');
  
  fireEvent.click(deleteButton);
  
  // Item disappears
  expect(queryByText('Item')).not.toBeInTheDocument();
  
  // Wait for error
  await waitFor(() => {
    // Item reappears
    expect(getByText('Item')).toBeInTheDocument();
  });
});
```

### 3. Test Network Delay
```typescript
test('handles slow network', async () => {
  // Mock slow API
  api.delete.mockImplementation(() => 
    new Promise(resolve => setTimeout(resolve, 2000))
  );
  
  const { getByText } = render(<Component />);
  const deleteButton = getByText('Delete');
  
  fireEvent.click(deleteButton);
  
  // Item disappears immediately (not after 2s)
  expect(queryByText('Item')).not.toBeInTheDocument();
});
```

## Real-World Examples

### Twitter/X
```typescript
// Like a tweet
const likeTweet = async (tweetId: string) => {
  // Optimistic: Show heart filled
  setLiked(true);
  setLikeCount(count => count + 1);
  
  try {
    await api.likeTweet(tweetId);
  } catch (error) {
    // Revert: Show heart empty
    setLiked(false);
    setLikeCount(count => count - 1);
  }
};
```

### Gmail
```typescript
// Archive email
const archiveEmail = async (emailId: string) => {
  // Optimistic: Remove from inbox
  setEmails(emails => emails.filter(e => e.id !== emailId));
  
  // Show undo option
  showUndoToast('Email archived', () => {
    // Undo: Add back to inbox
    setEmails(emails => [...emails, archivedEmail]);
  });
  
  try {
    await api.archiveEmail(emailId);
  } catch (error) {
    // Revert: Add back to inbox
    setEmails(emails => [...emails, archivedEmail]);
    showError('Archive failed');
  }
};
```

### Slack
```typescript
// React to message
const addReaction = async (messageId: string, emoji: string) => {
  // Optimistic: Show reaction
  setReactions(reactions => [...reactions, { emoji, userId: currentUser.id }]);
  
  try {
    await api.addReaction(messageId, emoji);
  } catch (error) {
    // Revert: Remove reaction
    setReactions(reactions => 
      reactions.filter(r => !(r.emoji === emoji && r.userId === currentUser.id))
    );
  }
};
```

## Performance Tips

1. **Batch Updates** - Group multiple state updates
2. **Use Transitions** - React 18 transitions for smooth updates
3. **Debounce Rapid Actions** - Prevent spam clicking
4. **Cancel Pending Requests** - Use AbortController
5. **Cache Results** - Avoid redundant backend calls

## Accessibility

1. **Announce Changes** - Use ARIA live regions
2. **Maintain Focus** - Don't lose focus on updates
3. **Show Loading States** - Indicate background operations
4. **Provide Feedback** - Confirm actions with messages

## Summary

Optimistic updates make your app feel fast and responsive by updating the UI immediately, then syncing with the backend in the background. The key is proper error handling to revert changes when things go wrong.

**Golden Rule:** Update UI first, sync backend second, handle errors always.
