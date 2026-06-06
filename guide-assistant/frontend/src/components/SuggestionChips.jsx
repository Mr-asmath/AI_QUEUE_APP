export default function SuggestionChips({ suggestions, onSelect }) {
  return (
    <div className="suggestion-row" aria-label="Suggested assistant actions">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion.intent || suggestion.label}
          className="suggestion-chip"
          type="button"
          onClick={() => onSelect(suggestion.label)}
        >
          {suggestion.label}
        </button>
      ))}
    </div>
  );
}
