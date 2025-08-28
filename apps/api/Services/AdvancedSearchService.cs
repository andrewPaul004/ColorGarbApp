using Microsoft.EntityFrameworkCore;
using ColorGarbApi.Data;
using ColorGarbApi.Models;
using ColorGarbApi.Models.Entities;

namespace ColorGarbApi.Services;

/// <summary>
/// Advanced search service for communication audit data with full-text search capabilities.
/// Provides sophisticated filtering, ranking, and performance optimizations.
/// </summary>
/// <since>3.4.0</since>
public class AdvancedSearchService
{
    private readonly ColorGarbDbContext _context;
    private readonly ILogger<AdvancedSearchService> _logger;

    public AdvancedSearchService(
        ColorGarbDbContext context,
        ILogger<AdvancedSearchService> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Performs advanced full-text search with ranking and highlighting
    /// </summary>
    public async Task<AdvancedSearchResult> SearchWithRankingAsync(AdvancedSearchRequest request)
    {
        try
        {
            _logger.LogDebug("Advanced search requested with term '{SearchTerm}'", request.SearchTerm);

            var baseQuery = _context.CommunicationLogs
                .Include(c => c.Order)
                .Include(c => c.DeliveryLogs)
                .AsQueryable();

            // Apply basic filters
            baseQuery = ApplyBasicFilters(baseQuery, request);

            // Apply advanced search with ranking
            var rankedResults = await ApplyAdvancedSearchAsync(baseQuery, request);

            // Get total count for pagination
            var totalCount = await GetSearchCountAsync(baseQuery, request);

            return new AdvancedSearchResult
            {
                Results = rankedResults,
                TotalCount = totalCount,
                SearchTerm = request.SearchTerm,
                Page = request.Page,
                PageSize = request.PageSize,
                SearchHighlights = GenerateSearchHighlights(rankedResults, request.SearchTerm)
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error performing advanced search");
            throw;
        }
    }

    /// <summary>
    /// Generates search suggestions based on partial input
    /// </summary>
    public async Task<List<string>> GetSearchSuggestionsAsync(string partialTerm, int maxSuggestions = 10)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(partialTerm) || partialTerm.Length < 2)
                return new List<string>();

            var suggestions = new List<string>();

            // Get subject suggestions
            var subjectSuggestions = await _context.CommunicationLogs
                .Where(c => c.Subject != null && c.Subject.Contains(partialTerm))
                .Select(c => c.Subject)
                .Distinct()
                .Take(5)
                .ToListAsync();

            suggestions.AddRange(subjectSuggestions!);

            // Get template suggestions
            var templateSuggestions = await _context.CommunicationLogs
                .Where(c => c.TemplateUsed != null && c.TemplateUsed.Contains(partialTerm))
                .Select(c => c.TemplateUsed)
                .Distinct()
                .Take(3)
                .ToListAsync();

            suggestions.AddRange(templateSuggestions!);

            // Get communication type suggestions
            var typeSuggestions = await _context.CommunicationLogs
                .Where(c => c.CommunicationType.Contains(partialTerm))
                .Select(c => c.CommunicationType)
                .Distinct()
                .Take(2)
                .ToListAsync();

            suggestions.AddRange(typeSuggestions);

            return suggestions.Take(maxSuggestions).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating search suggestions");
            return new List<string>();
        }
    }

    /// <summary>
    /// Performs faceted search to show available filter options
    /// </summary>
    public async Task<SearchFacets> GetSearchFacetsAsync(CommunicationAuditSearchRequest searchRequest)
    {
        try
        {
            var query = _context.CommunicationLogs.AsQueryable();
            
            // Apply existing filters (except the ones we're faceting on)
            query = ApplyFiltersForFaceting(query, searchRequest);

            var facets = new SearchFacets();

            // Communication Type facets
            facets.CommunicationTypes = await query
                .GroupBy(c => c.CommunicationType)
                .Select(g => new FacetItem { Value = g.Key, Count = g.Count() })
                .OrderByDescending(f => f.Count)
                .Take(10)
                .ToListAsync();

            // Delivery Status facets
            facets.DeliveryStatuses = await query
                .GroupBy(c => c.DeliveryStatus)
                .Select(g => new FacetItem { Value = g.Key, Count = g.Count() })
                .OrderByDescending(f => f.Count)
                .Take(10)
                .ToListAsync();

            // Template facets
            facets.Templates = await query
                .Where(c => c.TemplateUsed != null)
                .GroupBy(c => c.TemplateUsed)
                .Select(g => new FacetItem { Value = g.Key!, Count = g.Count() })
                .OrderByDescending(f => f.Count)
                .Take(10)
                .ToListAsync();

            // Date range facets (by month)
            facets.DateRanges = await query
                .GroupBy(c => new { c.SentAt.Year, c.SentAt.Month })
                .Select(g => new FacetItem 
                { 
                    Value = $"{g.Key.Year}-{g.Key.Month:D2}", 
                    Count = g.Count() 
                })
                .OrderByDescending(f => f.Value)
                .Take(12)
                .ToListAsync();

            return facets;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating search facets");
            throw;
        }
    }

    #region Private Helper Methods

    private IQueryable<CommunicationLog> ApplyBasicFilters(IQueryable<CommunicationLog> query, AdvancedSearchRequest request)
    {
        if (request.OrganizationId.HasValue)
        {
            query = query.Where(c => c.Order.OrganizationId == request.OrganizationId.Value);
        }

        if (request.OrderId.HasValue)
        {
            query = query.Where(c => c.OrderId == request.OrderId.Value);
        }

        if (request.CommunicationType?.Any() == true)
        {
            query = query.Where(c => request.CommunicationType.Contains(c.CommunicationType));
        }

        if (request.DeliveryStatus?.Any() == true)
        {
            query = query.Where(c => request.DeliveryStatus.Contains(c.DeliveryStatus));
        }

        if (request.DateFrom.HasValue)
        {
            query = query.Where(c => c.SentAt >= request.DateFrom.Value);
        }

        if (request.DateTo.HasValue)
        {
            query = query.Where(c => c.SentAt <= request.DateTo.Value);
        }

        return query;
    }

    private async Task<List<RankedSearchResult>> ApplyAdvancedSearchAsync(IQueryable<CommunicationLog> query, AdvancedSearchRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            // No search term, return ordered results
            var results = await query
                .OrderByDescending(c => c.SentAt)
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .ToListAsync();

            return results.Select(r => new RankedSearchResult
            {
                CommunicationLog = r,
                RelevanceScore = 1.0f,
                MatchFields = new List<string>()
            }).ToList();
        }

        var searchTerm = request.SearchTerm.ToLower().Trim();
        var searchTerms = searchTerm.Split(' ', StringSplitOptions.RemoveEmptyEntries);

        // Get all matching records with basic filtering
        var allMatches = await query.Where(c => 
            c.Content.ToLower().Contains(searchTerm) ||
            (c.Subject != null && c.Subject.ToLower().Contains(searchTerm)) ||
            (c.RecipientEmail != null && c.RecipientEmail.ToLower().Contains(searchTerm)) ||
            (c.TemplateUsed != null && c.TemplateUsed.ToLower().Contains(searchTerm))
        ).ToListAsync();

        // Calculate relevance scores and match fields
        var rankedResults = allMatches.Select(log => {
            var result = new RankedSearchResult
            {
                CommunicationLog = log,
                RelevanceScore = CalculateRelevanceScore(log, searchTerms),
                MatchFields = GetMatchingFields(log, searchTerms)
            };
            return result;
        })
        .OrderByDescending(r => r.RelevanceScore)
        .ThenByDescending(r => r.CommunicationLog.SentAt)
        .Skip((request.Page - 1) * request.PageSize)
        .Take(request.PageSize)
        .ToList();

        return rankedResults;
    }

    private float CalculateRelevanceScore(CommunicationLog log, string[] searchTerms)
    {
        float score = 0;

        foreach (var term in searchTerms)
        {
            // Subject matches are weighted highest
            if (log.Subject?.ToLower().Contains(term) == true)
            {
                score += 5.0f;
                // Exact word matches get bonus
                if (log.Subject.ToLower().Split(' ').Contains(term))
                    score += 2.0f;
            }

            // Content matches
            if (log.Content.ToLower().Contains(term))
            {
                score += 3.0f;
                // Multiple occurrences get bonus
                var occurrences = CountOccurrences(log.Content.ToLower(), term);
                score += Math.Min(occurrences - 1, 2) * 0.5f;
            }

            // Email/phone matches
            if (log.RecipientEmail?.ToLower().Contains(term) == true)
                score += 2.0f;

            if (log.RecipientPhone?.Contains(term) == true)
                score += 2.0f;

            // Template matches
            if (log.TemplateUsed?.ToLower().Contains(term) == true)
                score += 1.5f;

            // Communication type matches
            if (log.CommunicationType.ToLower().Contains(term))
                score += 1.0f;
        }

        // Recent communications get slight boost
        var daysSinceSent = (DateTime.UtcNow - log.SentAt).TotalDays;
        if (daysSinceSent < 30)
        {
            score += (30 - (float)daysSinceSent) / 30 * 0.5f;
        }

        return score;
    }

    private List<string> GetMatchingFields(CommunicationLog log, string[] searchTerms)
    {
        var matchingFields = new List<string>();

        foreach (var term in searchTerms)
        {
            if (log.Subject?.ToLower().Contains(term) == true)
                matchingFields.Add("Subject");
            if (log.Content.ToLower().Contains(term))
                matchingFields.Add("Content");
            if (log.RecipientEmail?.ToLower().Contains(term) == true)
                matchingFields.Add("RecipientEmail");
            if (log.RecipientPhone?.Contains(term) == true)
                matchingFields.Add("RecipientPhone");
            if (log.TemplateUsed?.ToLower().Contains(term) == true)
                matchingFields.Add("TemplateUsed");
            if (log.CommunicationType.ToLower().Contains(term))
                matchingFields.Add("CommunicationType");
        }

        return matchingFields.Distinct().ToList();
    }

    private int CountOccurrences(string text, string term)
    {
        if (string.IsNullOrEmpty(text) || string.IsNullOrEmpty(term))
            return 0;

        int count = 0;
        int index = 0;
        while ((index = text.IndexOf(term, index)) != -1)
        {
            count++;
            index += term.Length;
        }
        return count;
    }

    private async Task<int> GetSearchCountAsync(IQueryable<CommunicationLog> query, AdvancedSearchRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            return await query.CountAsync();
        }

        var searchTerm = request.SearchTerm.ToLower().Trim();
        return await query.Where(c => 
            c.Content.ToLower().Contains(searchTerm) ||
            (c.Subject != null && c.Subject.ToLower().Contains(searchTerm)) ||
            (c.RecipientEmail != null && c.RecipientEmail.ToLower().Contains(searchTerm)) ||
            (c.TemplateUsed != null && c.TemplateUsed.ToLower().Contains(searchTerm))
        ).CountAsync();
    }

    private IQueryable<CommunicationLog> ApplyFiltersForFaceting(IQueryable<CommunicationLog> query, CommunicationAuditSearchRequest request)
    {
        if (request.OrganizationId.HasValue)
        {
            query = query.Where(c => c.Order.OrganizationId == request.OrganizationId.Value);
        }

        if (request.OrderId.HasValue)
        {
            query = query.Where(c => c.OrderId == request.OrderId.Value);
        }

        if (request.DateFrom.HasValue)
        {
            query = query.Where(c => c.SentAt >= request.DateFrom.Value);
        }

        if (request.DateTo.HasValue)
        {
            query = query.Where(c => c.SentAt <= request.DateTo.Value);
        }

        return query;
    }

    private Dictionary<string, List<string>> GenerateSearchHighlights(List<RankedSearchResult> results, string? searchTerm)
    {
        if (string.IsNullOrWhiteSpace(searchTerm))
            return new Dictionary<string, List<string>>();

        var highlights = new Dictionary<string, List<string>>();
        var terms = searchTerm.Split(' ', StringSplitOptions.RemoveEmptyEntries);

        foreach (var result in results)
        {
            var logHighlights = new List<string>();
            var log = result.CommunicationLog;

            foreach (var term in terms)
            {
                // Highlight matching content snippets
                if (log.Content.ToLower().Contains(term.ToLower()))
                {
                    var snippet = ExtractSnippet(log.Content, term, 50);
                    logHighlights.Add($"Content: ...{snippet}...");
                }

                if (log.Subject?.ToLower().Contains(term.ToLower()) == true)
                {
                    logHighlights.Add($"Subject: {log.Subject}");
                }
            }

            if (logHighlights.Any())
            {
                highlights[log.Id.ToString()] = logHighlights;
            }
        }

        return highlights;
    }

    private string ExtractSnippet(string text, string term, int maxLength)
    {
        var index = text.ToLower().IndexOf(term.ToLower());
        if (index == -1) return text.Substring(0, Math.Min(text.Length, maxLength));

        var start = Math.Max(0, index - maxLength / 2);
        var end = Math.Min(text.Length, start + maxLength);
        
        return text.Substring(start, end - start);
    }

    #endregion
}

#region Support Models

/// <summary>
/// Advanced search request with ranking and relevance options
/// </summary>
public class AdvancedSearchRequest : CommunicationAuditSearchRequest
{
    /// <summary>
    /// Enable relevance-based ranking
    /// </summary>
    public bool EnableRelevanceRanking { get; set; } = true;

    /// <summary>
    /// Include search highlights in results
    /// </summary>
    public bool IncludeHighlights { get; set; } = true;

    /// <summary>
    /// Minimum relevance score threshold
    /// </summary>
    public float MinRelevanceScore { get; set; } = 0.1f;
}

/// <summary>
/// Advanced search result with ranking information
/// </summary>
public class AdvancedSearchResult
{
    /// <summary>
    /// Ranked search results
    /// </summary>
    public List<RankedSearchResult> Results { get; set; } = new();

    /// <summary>
    /// Total count of matching records
    /// </summary>
    public int TotalCount { get; set; }

    /// <summary>
    /// Original search term
    /// </summary>
    public string? SearchTerm { get; set; }

    /// <summary>
    /// Current page number
    /// </summary>
    public int Page { get; set; }

    /// <summary>
    /// Page size
    /// </summary>
    public int PageSize { get; set; }

    /// <summary>
    /// Search highlights by record ID
    /// </summary>
    public Dictionary<string, List<string>> SearchHighlights { get; set; } = new();
}

/// <summary>
/// Ranked search result with relevance scoring
/// </summary>
public class RankedSearchResult
{
    /// <summary>
    /// The communication log record
    /// </summary>
    public CommunicationLog CommunicationLog { get; set; } = null!;

    /// <summary>
    /// Relevance score (0.0 to 10.0+)
    /// </summary>
    public float RelevanceScore { get; set; }

    /// <summary>
    /// Fields that matched the search terms
    /// </summary>
    public List<string> MatchFields { get; set; } = new();
}

/// <summary>
/// Search facets for filtering
/// </summary>
public class SearchFacets
{
    /// <summary>
    /// Communication type facets
    /// </summary>
    public List<FacetItem> CommunicationTypes { get; set; } = new();

    /// <summary>
    /// Delivery status facets
    /// </summary>
    public List<FacetItem> DeliveryStatuses { get; set; } = new();

    /// <summary>
    /// Template facets
    /// </summary>
    public List<FacetItem> Templates { get; set; } = new();

    /// <summary>
    /// Date range facets
    /// </summary>
    public List<FacetItem> DateRanges { get; set; } = new();
}

/// <summary>
/// Individual facet item
/// </summary>
public class FacetItem
{
    /// <summary>
    /// Facet value
    /// </summary>
    public string Value { get; set; } = string.Empty;

    /// <summary>
    /// Number of records with this value
    /// </summary>
    public int Count { get; set; }
}

#endregion