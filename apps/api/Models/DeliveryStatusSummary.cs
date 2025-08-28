namespace ColorGarbApi.Models;

/// <summary>
/// Summary model for communication delivery status reporting.
/// Provides aggregated statistics for monitoring and compliance.
/// </summary>
/// <since>3.4.0</since>
public class DeliveryStatusSummary
{
    /// <summary>
    /// Organization ID for the summary
    /// </summary>
    public Guid OrganizationId { get; set; }

    /// <summary>
    /// Start date of the reporting period
    /// </summary>
    public DateTimeOffset From { get; set; }

    /// <summary>
    /// End date of the reporting period
    /// </summary>
    public DateTimeOffset To { get; set; }

    /// <summary>
    /// Total number of communications in the reporting period
    /// </summary>
    public int TotalCommunications { get; set; }

    /// <summary>
    /// Breakdown of communications by delivery status
    /// </summary>
    public Dictionary<string, int> StatusCounts { get; set; } = new Dictionary<string, int>();

    /// <summary>
    /// Breakdown of communications by type (Email, SMS, Message, SystemNotification)
    /// </summary>
    public Dictionary<string, int> TypeCounts { get; set; } = new Dictionary<string, int>();

    /// <summary>
    /// Daily communication volume during the reporting period
    /// </summary>
    public List<DailyCommunicationVolume> DailyVolume { get; set; } = new List<DailyCommunicationVolume>();

    /// <summary>
    /// Delivery success rate as a percentage (0-100)
    /// </summary>
    public double DeliverySuccessRate { get; set; }

    /// <summary>
    /// Average delivery time in minutes (for delivered communications)
    /// </summary>
    public double? AverageDeliveryTimeMinutes { get; set; }

    /// <summary>
    /// Top failure reasons (if any failures occurred)
    /// </summary>
    public List<FailureReasonSummary> TopFailureReasons { get; set; } = new List<FailureReasonSummary>();

    /// <summary>
    /// Peak communication hour (0-23) based on send volume
    /// </summary>
    public int PeakHour { get; set; }

    /// <summary>
    /// Communication volume by hour of day
    /// </summary>
    public Dictionary<int, int> HourlyVolume { get; set; } = new Dictionary<int, int>();
}

/// <summary>
/// Daily communication volume summary
/// </summary>
public class DailyCommunicationVolume
{
    /// <summary>
    /// Date for this volume summary
    /// </summary>
    public DateTime Date { get; set; }

    /// <summary>
    /// Total communications sent on this date
    /// </summary>
    public int TotalSent { get; set; }

    /// <summary>
    /// Number of communications delivered on this date
    /// </summary>
    public int Delivered { get; set; }

    /// <summary>
    /// Number of communications that failed on this date
    /// </summary>
    public int Failed { get; set; }

    /// <summary>
    /// Delivery rate for this date as a percentage (0-100)
    /// </summary>
    public double DeliveryRate => TotalSent > 0 ? (double)Delivered / TotalSent * 100 : 0;
}

/// <summary>
/// Summary of communication failure reasons
/// </summary>
public class FailureReasonSummary
{
    /// <summary>
    /// The failure reason text
    /// </summary>
    public string Reason { get; set; } = string.Empty;

    /// <summary>
    /// Number of communications that failed with this reason
    /// </summary>
    public int Count { get; set; }

    /// <summary>
    /// Percentage of total failures represented by this reason
    /// </summary>
    public double Percentage { get; set; }

    /// <summary>
    /// Most recent occurrence of this failure reason
    /// </summary>
    public DateTime LastOccurrence { get; set; }
}