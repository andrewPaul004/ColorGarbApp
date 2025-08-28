using ColorGarbApi.Models.Entities;

namespace ColorGarbApi.Models;

/// <summary>
/// Result model for communication audit search operations.
/// Contains paginated results and summary statistics.
/// </summary>
/// <since>3.4.0</since>
public class CommunicationAuditResult
{
    /// <summary>
    /// List of communication logs matching the search criteria
    /// </summary>
    public IEnumerable<CommunicationLog> Logs { get; set; } = new List<CommunicationLog>();

    /// <summary>
    /// Total number of communications matching the search criteria
    /// </summary>
    public int TotalCount { get; set; }

    /// <summary>
    /// Current page number (1-based)
    /// </summary>
    public int Page { get; set; }

    /// <summary>
    /// Number of items per page
    /// </summary>
    public int PageSize { get; set; }

    /// <summary>
    /// Indicates if there are more pages available
    /// </summary>
    public bool HasNextPage { get; set; }

    /// <summary>
    /// Indicates if there are previous pages available
    /// </summary>
    public bool HasPreviousPage => Page > 1;

    /// <summary>
    /// Total number of pages available
    /// </summary>
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);

    /// <summary>
    /// Summary of delivery status distribution in the result set
    /// </summary>
    public Dictionary<string, int> StatusSummary { get; set; } = new Dictionary<string, int>();

    /// <summary>
    /// Summary of communication types distribution in the result set
    /// </summary>
    public Dictionary<string, int> TypeSummary { get; set; } = new Dictionary<string, int>();

    /// <summary>
    /// Date range of the communications in the result set
    /// </summary>
    public DateRangeSummary? DateRange { get; set; }
}

/// <summary>
/// Summary of date range for communication results
/// </summary>
public class DateRangeSummary
{
    /// <summary>
    /// Earliest communication date in the result set
    /// </summary>
    public DateTime EarliestDate { get; set; }

    /// <summary>
    /// Latest communication date in the result set
    /// </summary>
    public DateTime LatestDate { get; set; }

    /// <summary>
    /// Number of days spanned by the result set
    /// </summary>
    public int DaysSpanned => (int)(LatestDate - EarliestDate).TotalDays + 1;
}